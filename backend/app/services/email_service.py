import secrets
import os
from datetime import datetime, timezone, timedelta
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

from app.core.config import settings
from app.models.user import User
from app.models.action_token import ActionToken, ActionTokenType
from app.repositories.action_token_repo import ActionTokenRepository

# Configuración de SMTP
conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.EMAILS_FROM_EMAIL,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
    MAIL_STARTTLS=settings.SMTP_TLS,
    MAIL_SSL_TLS=settings.SMTP_SSL,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "email")
)

class EmailService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ActionTokenRepository(db)
        self.fm = FastMail(conf)

    def _create_token(self, user_id: int, token_type: ActionTokenType, expires_hours: int = 1) -> str:
        """
        Genera un token seguro y lo persiste en la base de datos.
        """
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
        
        db_token = ActionToken(
            user_id=user_id,
            token=token,
            type=token_type,
            expires_at=expires_at
        )
        self.db.add(db_token)
        self.db.commit()
        return token

    async def send_verification_email(self, user: User):
        """
        Genera el token de verificación y envía el correo real.
        """
        token = self._create_token(user.id, ActionTokenType.VERIFICATION, expires_hours=24)
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        
        message = MessageSchema(
            subject=f"Verifica tu cuenta en {settings.EMAILS_FROM_NAME}",
            recipients=[user.email],
            template_body={
                "name": user.name, 
                "verification_link": verification_link,
                "current_year": datetime.now().year
            },
            subtype=MessageType.html
        )
        
        await self.fm.send_message(message, template_name="verification.html")
        return token

    async def send_password_reset_email(self, user: User):
        """
        Genera el token de reset y envía el correo de recuperación real.
        """
        token = self._create_token(user.id, ActionTokenType.PASSWORD_RESET, expires_hours=1)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        message = MessageSchema(
            subject=f"Recuperación de contraseña - {settings.EMAILS_FROM_NAME}",
            recipients=[user.email],
            template_body={
                "name": user.name, 
                "reset_link": reset_link, 
                "token": token[:6].upper(),
                "current_year": datetime.now().year
            },
            subtype=MessageType.html
        )
        
        await self.fm.send_message(message, template_name="password_reset.html")
        return token
