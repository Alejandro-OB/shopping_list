from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db.session import get_db
from app.schemas.heartbeat import HeartbeatOut
from app.services.heartbeat_service import HeartbeatService

router = APIRouter()


@router.get("/", response_model=HeartbeatOut, summary="Estado del servidor")
def get_heartbeat(db: Session = Depends(get_db)):
    """
    Devuelve el estado actual del heartbeat (contador de pings y timestamp del último ping).
    No requiere autenticación — útil para health checks.
    """
    return HeartbeatService(db).get()


@router.post("/", response_model=HeartbeatOut, summary="Registrar ping")
def ping_heartbeat(db: Session = Depends(get_db)):
    """
    Incrementa el contador de pings y actualiza el timestamp.
    Crea el registro si no existe.
    """
    return HeartbeatService(db).ping()
