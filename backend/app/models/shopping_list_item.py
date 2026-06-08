from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, Boolean, CheckConstraint, String
from sqlalchemy.orm import Mapped, relationship, mapped_column
from app.core.db.base import Base

if TYPE_CHECKING:
    from app.models.shopping_list import ShoppingList
    from app.models.product_store import ProductStore

class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    list_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False)
    product_store_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("product_stores.id", ondelete="CASCADE"), nullable=True
    )
    free_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    price_catalog_snapshot: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    price_real: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

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
    shopping_list: Mapped["ShoppingList"] = relationship("ShoppingList", back_populates="items")
    product_store: Mapped[Optional["ProductStore"]] = relationship("ProductStore", back_populates="items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_quantity_positive"),
        CheckConstraint("price_real >= 0", name="ck_price_real_non_negative"),
        CheckConstraint(
            "(product_store_id IS NOT NULL AND free_name IS NULL) OR "
            "(product_store_id IS NULL AND free_name IS NOT NULL)",
            name="ck_item_linked_xor_free",
        ),
    )
