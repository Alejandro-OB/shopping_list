from typing import List, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.shopping_list import ShoppingList, ListStatus
from app.models.shopping_list_item import ShoppingListItem
from app.schemas.shopping_list import ShoppingListCreate, ShoppingListUpdate
from app.repositories.base_repo import BaseRepository

class ShoppingListRepository(BaseRepository[ShoppingList, ShoppingListCreate, ShoppingListUpdate]):
    def __init__(self, db: Session):
        super().__init__(ShoppingList, db)

    def get(self, id: int) -> Optional[ShoppingList]:
        """
        Obtiene una lista con sus ítems y relaciones cargadas (eager loading).
        """
        from sqlalchemy.orm import joinedload
        from app.models.shopping_list_item import ShoppingListItem
        from app.models.product_store import ProductStore
        
        query = select(self.model).options(
            joinedload(self.model.items)
                .joinedload(ShoppingListItem.product_store)
                .joinedload(ProductStore.product),
            joinedload(self.model.items)
                .joinedload(ShoppingListItem.product_store)
                .joinedload(ProductStore.store)
        ).filter(self.model.id == id)
        
        result = self.db.execute(query).unique().scalars().first()
        if result and result.items:
            result.items.sort(key=lambda x: (x.product_store.store.name if x.product_store and x.product_store.store else ""))
        return result

    def get_by_user(self, user_id: int, *, skip: int = 0, limit: int = 100) -> List[ShoppingList]:
        """
        Obtiene las listas de un usuario con sus relaciones.
        """
        from sqlalchemy.orm import joinedload
        from app.models.shopping_list_item import ShoppingListItem
        from app.models.product_store import ProductStore

        query = select(self.model).options(
            joinedload(self.model.items)
                .joinedload(ShoppingListItem.product_store)
                .joinedload(ProductStore.product),
            joinedload(self.model.items)
                .joinedload(ShoppingListItem.product_store)
                .joinedload(ProductStore.store)
        ).filter(self.model.user_id == user_id).offset(skip).limit(limit)

        results = self.db.execute(query).unique().scalars().all()
        for sl in results:
            if sl.items:
                sl.items.sort(key=lambda x: (x.product_store.store.name if x.product_store and x.product_store.store else ""))
        return results

    def get_by_date_range(self, user_id: int, start_date: datetime, end_date: datetime) -> Optional[ShoppingList]:
        """
        Busca si ya existe una lista para el usuario en un rango de fechas.
        Utilizado para no duplicar la generación automática.
        """
        return self.db.execute(
            select(self.model).filter(
                and_(
                    self.model.user_id == user_id,
                    self.model.date >= start_date,
                    self.model.date <= end_date
                )
            )
        ).scalars().first()

class ShoppingListItemRepository(BaseRepository[ShoppingListItem, Any, Any]):
    # Note: No schema for create/update as it's managed by the service normally
    def __init__(self, db: Session):
        super().__init__(ShoppingListItem, db)

    def get(self, id: int) -> Optional[ShoppingListItem]:
        """
        Obtiene un ítem con sus relaciones cargadas.
        """
        from sqlalchemy.orm import joinedload
        from app.models.product_store import ProductStore
        
        query = select(self.model).options(
            joinedload(self.model.product_store).joinedload(ProductStore.product),
            joinedload(self.model.product_store).joinedload(ProductStore.store)
        ).filter(self.model.id == id)
        
        return self.db.execute(query).scalars().first()
