from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Numeric, Boolean, text
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

    # La tienda donde se compra este producto habitualmente. La generación
    # automática la prefiere al precio: ir a una tienda a la que no se va por
    # ahorrar unos pesos en un producto no compensa el viaje, y esa decisión la
    # toma quien compra, no el catálogo. Sin ninguna marcada, se sigue eligiendo
    # la más barata, que es como se comportaba antes.
    is_preferred: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )

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

    __table_args__ = (
        # Una tienda no se vincula dos veces al mismo producto. Hasta ahora nada
        # lo impedía en la base: solo el modal del frontend, que es la única
        # puerta de las varias que hay.
        Index(
            "uq_product_store_active",
            "product_id",
            "store_id",
            unique=True,
            postgresql_where=text("is_deleted = false"),
            sqlite_where=text("is_deleted = 0"),
        ),
        # Y una sola tienda preferida por producto.
        Index(
            "uq_product_store_preferred",
            "product_id",
            unique=True,
            postgresql_where=text("is_preferred = true AND is_deleted = false"),
            sqlite_where=text("is_preferred = 1 AND is_deleted = 0"),
        ),
    )
