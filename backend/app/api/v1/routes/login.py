from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any

from app.core.db.session import get_db
from app.core.security import create_access_token, create_refresh_token, verify_password, get_password_hash
from app.schemas.token import Token
from app.repositories.user_repo import UserRepository
from app.repositories.action_token_repo import ActionTokenRepository
from app.models.user_refresh_token import UserRefreshToken
from app.models.action_token import ActionTokenType
from app.api.deps import get_current_user
from app.services.email_service import EmailService
from app.schemas.user import PasswordRecoveryRequest, PasswordResetRequest

router = APIRouter()

@router.post("/login/", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db),
    email: str = Body(...),
    password: str = Body(...)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cuenta no registrada",
        )
        
    if not verify_password(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
        )
    
    # Check verification (Soft rule: can be hard-blocked if desired)
    if not user.is_verified:
        print(f"[SECURITY WARNING] User {user.email} login attempt without verification.")
    
    # Generar tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    # Guardar refresh token en DB
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    db_refresh = UserRefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at
    )
    db.add(db_refresh)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.post("/recover-password/", response_model=None)
def recover_password(
    *,
    db: Session = Depends(get_db),
    data: PasswordRecoveryRequest,
    background_tasks: BackgroundTasks,
) -> Any:
    """
    Genera el flujo morado de recuperación de contraseña.
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(data.email)
    
    if user:
        email_service = EmailService(db)
        background_tasks.add_task(email_service.send_password_reset_email, user)
        
    # Siempre retornamos éxito por seguridad (evitar enumeración de usuarios)
    return {"message": "Si el correo existe en nuestro sistema, recibirás una clave de recuperación en breve."}

@router.post("/reset-password/", response_model=None)
def reset_password(
    *,
    db: Session = Depends(get_db),
    data: PasswordResetRequest,
) -> Any:
    """
    Valida el token de reset y actualiza la contraseña del usuario.
    """
    token_repo = ActionTokenRepository(db)
    db_token = token_repo.get_valid_token(data.token, ActionTokenType.PASSWORD_RESET)
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
        
    user = db_token.user
    user.password = get_password_hash(data.new_password)
    db.add(user)
    
    # Invalida token
    token_repo.mark_as_used(db_token)
    db.commit()
    
    return {"message": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}

@router.post("/refresh/", response_model=Token)
def refresh_token(
    db: Session = Depends(get_db),
    refresh_token: str = Body(...)
) -> Any:
    """
    Get a new access token using a valid refresh token.
    """
    db_token = db.query(UserRefreshToken).filter(
        UserRefreshToken.token == refresh_token,
        UserRefreshToken.is_revoked == False,
        UserRefreshToken.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    # Generar nuevo access token
    new_access_token = create_access_token(db_token.user_id)
    
    return {
        "access_token": new_access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.post("/logout/")
def logout(
    db: Session = Depends(get_db),
    refresh_token: str = Body(...)
) -> Any:
    """
    Revokes a specific refresh token.
    """
    db_token = db.query(UserRefreshToken).filter(UserRefreshToken.token == refresh_token).first()
    if db_token:
        db_token.is_revoked = True
        db.commit()
    return {"message": "Logged out successfully"}

@router.post("/logout-all/")
def logout_all(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
) -> Any:
    """
    Revokes all refresh tokens for the current user.
    """
    db.query(UserRefreshToken).filter(
        UserRefreshToken.user_id == current_user.id
    ).update({"is_revoked": True})
    db.commit()
    return {"message": "Logged out from all devices"}
