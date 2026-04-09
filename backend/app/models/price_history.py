from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, relationship, mapped_column
from app.core.db.base import Base

if TYPE_CHECKING:
    from app.models.product_store import ProductStore

class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("product_stores.id", ondelete="CASCADE"), nullable=False)
    
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relaciones
    product_store: Mapped["ProductStore"] = relationship("ProductStore", back_populates="price_history")
