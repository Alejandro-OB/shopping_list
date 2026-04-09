from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.product import Product
from app.models.shopping_list_item import ShoppingListItem
from app.models.price_history import PriceHistory
from app.schemas.product import ProductCreate, ProductUpdate
from app.repositories.base_repo import BaseRepository

class ProductRepository(BaseRepository[Product, ProductCreate, ProductUpdate]):
    def __init__(self, db: Session):
        super().__init__(Product, db)

    def get_by_user(self, user_id: int, *, skip: int = 0, limit: int = 100) -> List[Product]:
        """
        Obtiene los productos activos de un usuario específico.
        """
        return self.db.execute(
            select(self.model).filter(
                and_(
                    self.model.user_id == user_id,
                    self.model.is_deleted == False
                )
            ).offset(skip).limit(limit)
        ).scalars().all()

    def remove(self, *, id: int) -> Product:
        """
        REGLA CRÍTICA: No borrar físicamente si hay historial.
        Solo permite el borrado físico si el producto no tiene ítems en listas 
        ni historial de precios registrado.
        """
        product = self.db.get(self.model, id)
        if not product:
            return None
        
        # 1. Verificar si tiene ítems en cualquier lista de compras
        has_items = self.db.query(ShoppingListItem).join(Product.product_stores).filter(
            Product.id == id
        ).first() is not None
        
        # 2. Verificar si tiene historial de precios
        has_history = self.db.query(PriceHistory).join(Product.product_stores).filter(
            Product.id == id
        ).first() is not None
        
        if has_items or has_history:
            raise ValueError(
                "No se puede borrar físicamente el producto porque tiene historial de compras. "
                "Use 'soft_delete' en su lugar."
            )
            
        self.db.delete(product)
        self.db.commit()
        return product
