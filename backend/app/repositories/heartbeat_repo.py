from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.heartbeat import Heartbeat

HEARTBEAT_ID = 1


class HeartbeatRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self) -> Optional[Heartbeat]:
        return self.db.execute(
            select(Heartbeat).where(Heartbeat.id == HEARTBEAT_ID)
        ).scalars().first()

    def upsert(self) -> Heartbeat:
        hb = self.get()
        if hb is None:
            hb = Heartbeat(id=HEARTBEAT_ID, value=1)
            self.db.add(hb)
        else:
            hb.value += 1
            from datetime import datetime, timezone
            hb.timestamp = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(hb)
        return hb
