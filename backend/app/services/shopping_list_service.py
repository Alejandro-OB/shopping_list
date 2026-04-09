from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.shopping_list import ListStatus
from app.api.deps import get_current_user
from app.services.logic.frequency import should_appear_today
from app.core.timezone import now_bogota, to_utc

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

    def generate_auto_lists(self, user_id: Optional[int] = None):
        """
        Genera automáticamente las listas usando los repositorios.
        Puede generar para un usuario específico o para todos.
        """
        today_bogota = now_bogota()
        
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
                    # Tomar la primera tienda activa
                    active_store = next((ps for ps in product.product_stores if not ps.is_deleted), None)
                    if active_store:
                        products_to_add.append(active_store)

            if not products_to_add:
                continue

            # 2. Buscar o crear la lista para hoy mediante el ShoppingListRepository
            start_of_day = today_bogota.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = today_bogota.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            existing_list = self.list_repo.get_by_date_range(
                user.id, to_utc(start_of_day), to_utc(end_of_day)
            )

            list_was_created = False
            if not existing_list:
                from app.models.shopping_list import ShoppingList
                current_list = ShoppingList(
                    user_id=user.id,
                    name=f"Lista Automática - {today_bogota.strftime('%Y-%m-%d')}",
                    date=to_utc(today_bogota),
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
        
        # Registrar en Historial de Precios
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
