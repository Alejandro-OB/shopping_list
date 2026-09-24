from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, Boolean, CheckConstraint, String, text
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
        # Un producto vinculado no se repite dentro de la misma lista: para eso
        # está quantity. Va como índice parcial y no como UniqueConstraint
        # porque los ítems libres llevan product_store_id nulo y quedarían todos
        # bajo la misma clave. Lo creó la migración c7f1a2b8e9d3; se declara
        # aquí para que el modelo diga lo que la base realmente tiene y para que
        # las tablas creadas desde el modelo —las de los tests— lo tengan.
        Index(
            "uq_list_product_store_partial",
            "list_id",
            "product_store_id",
            unique=True,
            postgresql_where=text("product_store_id IS NOT NULL"),
            sqlite_where=text("product_store_id IS NOT NULL"),
        ),
        CheckConstraint("quantity > 0", name="ck_quantity_positive"),
        CheckConstraint("price_real >= 0", name="ck_price_real_non_negative"),
        CheckConstraint(
            "(product_store_id IS NOT NULL AND free_name IS NULL) OR "
            "(product_store_id IS NULL AND free_name IS NOT NULL)",
            name="ck_item_linked_xor_free",
        ),
    )
