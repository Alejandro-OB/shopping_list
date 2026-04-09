from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.services.shopping_list_service import ShoppingListService

router = APIRouter()

@router.post("/generate-lists", status_code=status.HTTP_200_OK)
def trigger_generation(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Dispara manualmente el proceso de generación de listas para todos los usuarios.
    Solo accesible por administradores.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para realizar esta acción de sistema"
        )
    
    service = ShoppingListService(db)
    results = service.generate_auto_lists()
    return {
        "status": "success",
        "message": "Proceso de generación completado",
        "data": results
    }
