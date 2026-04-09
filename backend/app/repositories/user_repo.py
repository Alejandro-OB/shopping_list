from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdateProfile
from app.repositories.base_repo import BaseRepository

class UserRepository(BaseRepository[User, UserCreate, UserUpdateProfile]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        """
        Busca un usuario por su correo electrónico.
        """
        return self.db.execute(
            select(self.model).filter(self.model.email == email)
        ).scalars().first()
