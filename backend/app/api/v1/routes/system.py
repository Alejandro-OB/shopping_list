from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.schemas.system import HealthCheck, Heartbeat
from app.services.system_service import SystemService
from app.services.shopping_list_service import ShoppingListService

router = APIRouter()

@router.get("/health/", response_model=HealthCheck)
def health_check(db: Session = Depends(deps.get_db)):
    """
    Verifica la salud del sistema y la conexión a la base de datos a través del servicio.
    """
    service = SystemService(db)
    db_status = service.check_health()
    
    return {
        "status": "ok",
        "database": db_status,
        "version": "1.0.0"
    }

@router.post("/heartbeat/", response_model=Heartbeat, status_code=status.HTTP_201_CREATED)
def post_heartbeat(
    db: Session = Depends(deps.get_db)
):
    """
    Registra un latido (heartbeat) automáticamente a través del servicio.
    """
    service = SystemService(db)
    return service.create_heartbeat()

@router.post("/generate-lists/", status_code=status.HTTP_200_OK)
def trigger_generation(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Genera ahora la lista de la semana del hogar de quien lo pide, con todo lo
    que le tocaba desde el lunes. Antes corría para todos los usuarios; la
    corrida general queda solo para el scheduler.
    """
    service = ShoppingListService(db)
    results = service.generate_auto_lists(user_id=current_user.owner_id, catch_up=True)
    return {
        "status": "success",
        "message": "Proceso de generación completado",
        "data": results
    }
