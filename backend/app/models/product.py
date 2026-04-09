from datetime import datetime, timezone
from typing import List, TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Boolean, Enum as SqlEnum
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
    frequency: Mapped[FrequencyEnum] = mapped_column(SqlEnum(FrequencyEnum), nullable=False)
    frequency_start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
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
    user: Mapped["User"] = relationship("User", back_populates="products")
    product_stores: Mapped[List["ProductStore"]] = relationship(
        "ProductStore",
        back_populates="product",
        cascade="all, delete-orphan"
    )