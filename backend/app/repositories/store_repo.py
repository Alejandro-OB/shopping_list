from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.store import Store
from app.schemas.store import StoreCreate, StoreUpdate
from app.repositories.base_repo import BaseRepository

class StoreRepository(BaseRepository[Store, StoreCreate, StoreUpdate]):
    def __init__(self, db: Session):
        super().__init__(Store, db)

    def get_by_user(self, user_id: int, *, skip: int = 0, limit: int = 100) -> List[Store]:
        """
        Obtiene las tiendas activas de un usuario específico.
        """
        return self.db.execute(
            select(self.model).filter(
                and_(
                    self.model.user_id == user_id,
                    self.model.is_deleted == False
                )
            ).offset(skip).limit(limit)
        ).scalars().all()
