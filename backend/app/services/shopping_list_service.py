from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.shopping_list import ListStatus
from app.api.deps import get_current_user
from app.services.logic.frequency import should_appear_today
from app.core.timezone import now_bogota, to_utc, get_week_bounds, tuesday_of_week

# Importar Repositorios
from app.repositories.user_repo import UserRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.shopping_list_repo import ShoppingListRepository, ShoppingListItemRepository

# Importar modelos para asegurar registro en SQLAlchemy
import app.models

class ShoppingListService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.product_repo = ProductRepository(db)
        self.list_repo = ShoppingListRepository(db)
        self.item_repo = ShoppingListItemRepository(db)

    def generate_auto_lists(self, user_id: Optional[int] = None, reference_date_bogota: Optional[datetime] = None):
        """
        Genera automáticamente las listas usando los repositorios.
        Puede generar para un usuario específico o para todos.

        `reference_date_bogota` permite fijar el "hoy" (usado en tests para
        simular corridas del scheduler en días distintos de forma
        determinística); en producción siempre se omite y se usa now_bogota().
        """
        today_bogota = reference_date_bogota or now_bogota()
        
        if user_id:
            user = self.user_repo.get(user_id)
            users = [user] if user else []
        else:
            # Filtrar solo usuarios que deseen generación automática y estén verificados
            from sqlalchemy import and_, select
            from app.models.user import User
            users = self.db.execute(
                select(User).filter(and_(User.can_autogenerate_lists == True, User.is_verified == True))
            ).scalars().all()

        results = {
            "lists_created": 0,
            "items_added": 0,
            "user_ids_processed": []
        }

        for user in users:
            # 1. Obtener productos activos mediante el ProductRepository
            products = self.product_repo.get_by_user(user.id)

            products_to_add = []
            for product in products:
                if should_appear_today(product.frequency.value, product.frequency_start_date, today_bogota):
                    # Tomar la tienda activa más barata (price_catalog mínimo).
                    # Si está vinculado a una sola tienda, esa gana por defecto.
                    active_stores = [ps for ps in product.product_stores if not ps.is_deleted]
                    if active_stores:
                        cheapest = min(active_stores, key=lambda ps: ps.price_catalog)
                        products_to_add.append(cheapest)

            if not products_to_add:
                continue

            # 2. Buscar o crear la lista de ESTA SEMANA (no del día exacto). Las
            # frecuencias biweekly/monthly no están ancladas al martes como la
            # weekly, así que su ocurrencia puede caer en otro día de la misma
            # semana: se agrupan igual en una sola lista en vez de crear una
            # lista nueva por cada día distinto en que algo resulte "debido".
            week_start, week_end = get_week_bounds(today_bogota)

            existing_list = self.list_repo.get_by_date_range(
                user.id, to_utc(week_start), to_utc(week_end)
            )

            list_was_created = False
            if not existing_list:
                from app.models.shopping_list import ShoppingList
                list_date = tuesday_of_week(today_bogota)
                current_list = ShoppingList(
                    user_id=user.id,
                    name=f"Lista Automática - {list_date.strftime('%Y-%m-%d')}",
                    date=to_utc(list_date),
                    is_auto_generated=True,
                    status=ListStatus.draft
                )
                self.db.add(current_list)
                self.db.flush()
                list_was_created = True
            else:
                current_list = existing_list

            # 3. Agregar productos (sin duplicados)
            items_for_this_user = 0
            for ps in products_to_add:
                from sqlalchemy import select, and_
                from app.models.shopping_list_item import ShoppingListItem
                
                existing_item = self.db.execute(
                    select(ShoppingListItem).filter(
                        and_(
                            ShoppingListItem.list_id == current_list.id,
                            ShoppingListItem.product_store_id == ps.id
                        )
                    )
                ).scalars().first()

                if not existing_item:
                    new_item = ShoppingListItem(
                        list_id=current_list.id,
                        product_store_id=ps.id,
                        quantity=1,
                        checked=False,
                        price_catalog_snapshot=float(ps.price_catalog),
                        price_real=0
                    )
                    self.db.add(new_item)
                    items_for_this_user += 1
            
            if items_for_this_user > 0 or list_was_created:
                self.db.commit()
                if list_was_created:
                    results["lists_created"] += 1
                results["items_added"] += items_for_this_user
                results["user_ids_processed"].append(user.id)
            else:
                self.db.rollback()

        return results

    def check_item(self, item_id: int, price_real: float):
        """
        Marca un ítem como comprado asignando su precio real y creando el historial.
        """
        item = self.item_repo.get(item_id)
        if not item:
            raise ValueError("Ítem no encontrado o ha sido eliminado")

        if item.shopping_list.status == ListStatus.completed:
            raise ValueError("No se puede editar una lista completada")

        if item.checked:
            raise ValueError("El ítem ya ha sido comprado. El precio real no es modificable.")

        if price_real <= 0:
            raise ValueError("Se requiere un precio real mayor a 0 para completar la compra")

        # Actualizar ítem
        item.checked = True
        item.price_real = price_real

        # Registrar en Historial de Precios (solo aplica a ítems vinculados a un
        # producto de catálogo; los productos libres no tienen product_store_id)
        if item.product_store_id is not None:
            from app.models.price_history import PriceHistory
            history = PriceHistory(
                product_store_id=item.product_store_id,
                price=price_real,
                date=to_utc(now_bogota())
            )
            self.db.add(history)
        self.db.commit()
        return item

    def complete_list(self, list_id: int):
        """
        Marca una lista como completada (Status = completed).
        Una vez completada no puede ser editada.
        """
        shopping_list = self.list_repo.get(list_id)
        if not shopping_list:
            raise ValueError("Lista no encontrada")
        
        if shopping_list.status == ListStatus.completed:
            raise ValueError("La lista ya ha sido completada")
            
        shopping_list.status = ListStatus.completed
        self.db.add(shopping_list)
        self.db.commit()
        self.db.refresh(shopping_list)
        return shopping_list

    def compare_stores_for_list(self, list_id: int, user_id: int):
        """
        Para una lista, calcula cuánto costaría comprar todo en cada tienda
        relevante (tiendas donde al menos un producto de la lista está vinculado).
        Indica disponibles vs faltantes por tienda.
        """
        from sqlalchemy.orm import joinedload
        from sqlalchemy import select
        from app.models.product_store import ProductStore

        shopping_list = self.list_repo.get(list_id)
        if not shopping_list or shopping_list.user_id != user_id:
            raise ValueError("Lista no encontrada")

        linked_items = [i for i in shopping_list.items if i.product_store_id]
        free_items = [i for i in shopping_list.items if not i.product_store_id]
        free_total = sum(float(i.price_catalog_snapshot or 0) * i.quantity for i in free_items)

        if not linked_items:
            return {
                "list_id": list_id,
                "stores": [],
                "free_items_total": free_total,
                "items_total": len(shopping_list.items),
            }

        product_ids = list({i.product_store.product_id for i in linked_items if i.product_store})

        # Una sola query: todos los product_stores de los productos de la lista
        all_product_stores = self.db.execute(
            select(ProductStore).options(
                joinedload(ProductStore.store),
                joinedload(ProductStore.product),
            ).filter(
                ProductStore.product_id.in_(product_ids),
                ProductStore.is_deleted == False,  # noqa: E712
            )
        ).scalars().all()

        # Indexar precios por (product_id, store_id) y descubrir tiendas relevantes
        price_map = {}
        stores_seen = {}
        for ps in all_product_stores:
            price_map[(ps.product_id, ps.store_id)] = float(ps.price_catalog)
            stores_seen[ps.store_id] = ps.store.name

        result = []
        for store_id, store_name in stores_seen.items():
            available_count = 0
            missing_count = 0
            subtotal = 0.0
            missing_names = []
            for item in linked_items:
                pid = item.product_store.product_id
                if (pid, store_id) in price_map:
                    available_count += 1
                    subtotal += price_map[(pid, store_id)] * item.quantity
                else:
                    missing_count += 1
                    missing_names.append(item.product_store.product.name)
            result.append({
                "store_id": store_id,
                "store_name": store_name,
                "available_count": available_count,
                "missing_count": missing_count,
                "subtotal": subtotal,
                "missing_product_names": missing_names,
            })

        # Ordenar: más cobertura primero, ante empate menor subtotal
        result.sort(key=lambda r: (-r["available_count"], r["subtotal"]))

        return {
            "list_id": list_id,
            "stores": result,
            "free_items_total": free_total,
            "items_total": len(shopping_list.items),
        }

    def find_savings_for_list(self, list_id: int, user_id: int):
        """
        Para cada item vinculado de la lista, si el mismo Producto está vinculado
        a otra tienda con menor precio_catalog, calcular el ahorro potencial al
        moverlo a la tienda más barata. Útil para el caso real donde el usuario
        va a varias tiendas: en lugar de elegir "una mejor", optimiza ítem por ítem.
        """
        from sqlalchemy.orm import joinedload
        from sqlalchemy import select
        from app.models.product_store import ProductStore

        shopping_list = self.list_repo.get(list_id)
        if not shopping_list or shopping_list.user_id != user_id:
            raise ValueError("Lista no encontrada")

        linked_items = [i for i in shopping_list.items if i.product_store_id and i.product_store]
        if not linked_items:
            return {
                "list_id": list_id,
                "opportunities": [],
                "total_potential": 0.0,
                "items_with_alternatives": 0,
                "items_optimal": 0,
            }

        product_ids = list({i.product_store.product_id for i in linked_items})

        # Una sola query: todos los product_stores de los productos involucrados
        all_product_stores = self.db.execute(
            select(ProductStore).options(
                joinedload(ProductStore.store),
            ).filter(
                ProductStore.product_id.in_(product_ids),
                ProductStore.is_deleted == False,  # noqa: E712
            )
        ).scalars().all()

        # Indexar product_stores por product_id
        by_product: dict[int, list] = {}
        for ps in all_product_stores:
            by_product.setdefault(ps.product_id, []).append(ps)

        opportunities = []
        items_optimal = 0
        for item in linked_items:
            product_id = item.product_store.product_id
            candidates = by_product.get(product_id, [])
            if len(candidates) <= 1:
                # Producto vinculado a una sola tienda — no hay alternativa
                continue

            current_price = float(item.product_store.price_catalog)
            cheapest = min(candidates, key=lambda ps: ps.price_catalog)
            cheapest_price = float(cheapest.price_catalog)

            if cheapest.id == item.product_store_id or cheapest_price >= current_price:
                # Ya estás comprándolo en la tienda más barata
                items_optimal += 1
                continue

            savings_per_unit = current_price - cheapest_price
            savings_total = savings_per_unit * item.quantity

            opportunities.append({
                "item_id": item.id,
                "product_name": item.product_store.product.name,
                "quantity": item.quantity,
                "current_store_name": item.product_store.store.name,
                "current_price": current_price,
                "cheaper_store_id": cheapest.store_id,
                "cheaper_store_name": cheapest.store.name,
                "cheaper_price": cheapest_price,
                "savings_per_unit": savings_per_unit,
                "savings_total": savings_total,
            })

        opportunities.sort(key=lambda o: -o["savings_total"])
        total_potential = sum(o["savings_total"] for o in opportunities)

        return {
            "list_id": list_id,
            "opportunities": opportunities,
            "total_potential": total_potential,
            "items_with_alternatives": len(opportunities),
            "items_optimal": items_optimal,
        }
