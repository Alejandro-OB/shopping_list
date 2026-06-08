from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.heartbeat import Heartbeat
from app.repositories.heartbeat_repo import HeartbeatRepository


class HeartbeatService:
    def __init__(self, db: Session):
        self.repo = HeartbeatRepository(db)

    def get(self) -> Heartbeat:
        hb = self.repo.get()
        if hb is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Heartbeat no inicializado. Llama POST /heartbeat/ primero."
            )
        return hb

    def ping(self) -> Heartbeat:
        return self.repo.upsert()
