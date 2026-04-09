from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Any

from app.core.db.session import get_db
from app.api.deps import get_current_user, get_current_active_user
from app.models.user import User
from app.models.action_token import ActionTokenType
from app.repositories.user_repo import UserRepository
from app.repositories.action_token_repo import ActionTokenRepository
from app.schemas.user import UserCreate, UserUpdateProfile, UserUpdatePassword, UserOut
from app.services.email_service import EmailService
from app.core.security import get_password_hash, verify_password

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Carga un nuevo usuario. 
    Envía automáticamente el correo de verificación morado.
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    
    # Hashear contraseña
    user_in.password = get_password_hash(user_in.password)
    new_user = user_repo.create(obj_in=user_in)
    
    # ENVIAR CORREO DE VERIFICACIÓN (Background)
    email_service = EmailService(db)
    background_tasks.add_task(email_service.send_verification_email, new_user)
    
    return new_user

@router.get("/verify", response_model=None)
def verify_email(
    *,
    db: Session = Depends(get_db),
    token: str = Query(...)
) -> Any:
    """
    Verifica el correo electrónico de un usuario mediante su token.
    """
    token_repo = ActionTokenRepository(db)
    db_token = token_repo.get_valid_token(token, ActionTokenType.VERIFICATION)
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
        
    # Activar usuario
    user = db_token.user
    user.is_verified = True
    db.add(user)
    
    # Marcar token como usado
    token_repo.mark_as_used(db_token)
    db.commit()
    
    return {"message": "Cuenta verificada con éxito. Ya puedes iniciar sesión."}

@router.post("/resend-verification", response_model=None)
def resend_verification(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Reenvía el correo de verificación. Solo funciona si el usuario no está verificado.
    """
    if current_user.is_verified:
        return {"message": "Tu cuenta ya está verificada."}
        
    email_service = EmailService(db)
    background_tasks.add_task(email_service.send_verification_email, current_user)
    
    return {"message": "Se ha enviado un nuevo enlace de verificación a tu correo."}

@router.get("/me", response_model=UserOut)
def read_user_me(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get current user profile (access allowed for unverified users to see their status).
    """
    return current_user

@router.patch("/me", response_model=UserOut)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza el perfil del usuario actual (nombre o correo).
    """
    user_repo = UserRepository(db)
    
    if user_in.email and user_in.email != current_user.email:
        # Verificar que el email no esté en uso
        existing_user = user_repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="El correo ya está registrado en otra cuenta"
            )
            
    updated_user = user_repo.update(db_obj=current_user, obj_in=user_in)
    return updated_user

@router.patch("/me/password", status_code=status.HTTP_200_OK)
def update_password_me(
    *,
    db: Session = Depends(get_db),
    password_data: UserUpdatePassword,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Actualiza la contraseña validando la contraseña actual.
    """
    if not verify_password(password_data.current_password, current_user.password):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta"
        )
        
    user_repo = UserRepository(db)
    # create generic update dictionary
    updated_user = user_repo.update(
        db_obj=current_user, 
        obj_in={"password": get_password_hash(password_data.new_password)}
    )
    return {"detail": "Contraseña actualizada exitosamente"}

@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_user_me(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Elimina la cuenta del usuario actual y todos los datos asociados (listas, productos, tiendas).
    """
    # Gracias a cascade="all, delete-orphan" en los modelos, esto eliminará todo en cascada.
    user_repo = UserRepository(db)
    db.delete(current_user)
    db.commit()
    return {"detail": "Cuenta eliminada irreversiblemente"}
