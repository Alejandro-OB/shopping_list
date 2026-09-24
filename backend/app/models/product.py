from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, String, Boolean, Enum as SqlEnum
from sqlalchemy.orm import Mapped, relationship, mapped_column
from app.core.db.base import Base
import enum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.product_store import ProductStore

class FrequencyEnum(enum.Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    occasional = "occasional"

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    frequency: Mapped[FrequencyEnum] = mapped_column(SqlEnum(FrequencyEnum), nullable=False)
    frequency_start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Inventario. Se cuenta en la unidad en que el producto se consume, que no
    # siempre es la que se compra: un pollo se compra entero y se consume por
    # presas, un panal trae treinta huevos. units_per_purchase es esa
    # equivalencia y vale 1 en la mayoría de productos.
    #
    # stock nulo significa "de este producto no se lleva inventario", y es
    # distinto de cero, que significa "no queda ninguno". La distinción importa:
    # con cero por omisión, todo el catálogo existente quedaría bajo mínimo y
    # entraría de golpe en la siguiente lista generada.
    stock: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    stock_min: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0, server_default="0", nullable=False
    )
    units_per_purchase: Mapped[float] = mapped_column(
        Numeric(10, 2), default=1, server_default="1", nullable=False
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
    user: Mapped["User"] = relationship("User", back_populates="products")
    product_stores: Mapped[List["ProductStore"]] = relationship(
        "ProductStore",
        back_populates="product",
        cascade="all, delete-orphan"
    )