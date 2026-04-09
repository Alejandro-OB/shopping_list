from datetime import datetime, timezone
from typing import List, TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Boolean, Enum as SqlEnum
from sqlalchemy.orm import Mapped, relationship, mapped_column
from app.core.db.base import Base
import enum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.shopping_list_item import ShoppingListItem

class ListStatus(enum.Enum):
    draft = "draft"
    active = "active"
    completed = "completed"

class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    status: Mapped[ListStatus] = mapped_column(
        SqlEnum(ListStatus),
        default=ListStatus.draft,
        nullable=False
    )
    
    is_auto_generated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
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
    user: Mapped["User"] = relationship("User", back_populates="shopping_lists")
    
    items: Mapped[List["ShoppingListItem"]] = relationship(
        "ShoppingListItem",
        back_populates="shopping_list",
        cascade="all, delete-orphan"
    )
