import enum
from datetime import datetime, timezone, timedelta
from sqlalchemy import BigInteger, DateTime, String, ForeignKey, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

class ActionTokenType(str, enum.Enum):
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"

class ActionToken(Base):
    __tablename__ = "action_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    token: Mapped[str] = mapped_column(String(512), unique=True, index=True, nullable=False)
    type: Mapped[ActionTokenType] = mapped_column(Enum(ActionTokenType), nullable=False)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relación
    user: Mapped["User"] = relationship("User")
