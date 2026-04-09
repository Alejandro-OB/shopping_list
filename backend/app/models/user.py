from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db.base import Base

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.store import Store
    from app.models.shopping_list import ShoppingList

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(default=False, nullable=False)
    can_autogenerate_lists: Mapped[bool] = mapped_column(default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relaciones
    products: Mapped[List["Product"]] = relationship(
        "Product",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    stores: Mapped[List["Store"]] = relationship(
        "Store",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    shopping_lists: Mapped[List["ShoppingList"]] = relationship(
        "ShoppingList",
        back_populates="user",
        cascade="all, delete-orphan"
    )