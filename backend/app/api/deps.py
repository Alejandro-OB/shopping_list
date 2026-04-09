from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.core.db.session import get_db
from app.core.security import SECRET_KEY, ALGORITHM
from app.models.user import User

# El endpoint de login se llamará /login/access-token (estándar FastAPI)
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl="/api/v1/login/access-token"
)

def get_current_active_user(
    db: Session = Depends(get_db), 
    token: str = Depends(reusable_oauth2)
) -> User:
    """
    Lee el token JWT y valida la existencia del usuario, pero NO verifica 'is_verified'.
    Útil para el flujo de reenvío de correos o perfil básico.
    """
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM]
        )
        token_data_sub = payload.get("sub")
        if token_data_sub is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
        
    user = db.get(User, int(token_data_sub))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return user

def get_current_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Inyecta el usuario actual SI Y SOLO SI está verificado.
    Este es el estándar para la mayoría de los endpoints.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED"
        )
        
    return current_user
