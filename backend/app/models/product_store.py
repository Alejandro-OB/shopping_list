from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import Mapped, relationship, mapped_column
from app.core.db.base import Base

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.store import Store
    from app.models.shopping_list_item import ShoppingListItem
    from app.models.price_history import PriceHistory

class ProductStore(Base):
    __tablename__ = "product_stores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    
    price_catalog: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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
    product: Mapped["Product"] = relationship("Product", back_populates="product_stores")
    store: Mapped["Store"] = relationship("Store", back_populates="product_stores")
    
    items: Mapped[List["ShoppingListItem"]] = relationship(
        "ShoppingListItem",
        back_populates="product_store",
        cascade="all, delete-orphan"
    )
    
    price_history: Mapped[List["PriceHistory"]] = relationship(
        "PriceHistory",
        back_populates="product_store",
        cascade="all, delete-orphan"
    )
