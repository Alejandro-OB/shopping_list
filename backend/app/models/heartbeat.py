from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db.base import Base


class Heartbeat(Base):
    __tablename__ = "heartbeats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
