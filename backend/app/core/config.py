from typing import Optional, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, field_validator, ValidationInfo

class Settings(BaseSettings):
    # Proporciona soporte para leer .env automáticamente
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Base de Datos
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "shopping_list"
    POSTGRES_PORT: int = 5432
    
    # Entorno (local o supabase)
    ENVIRONMENT: str = "local"
    SUPABASE_DATABASE_URI: Optional[str] = None
    
    # URL de Conexión (Se construye dinámicamente)
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> Any:
        if isinstance(v, str):
            return v
        
        # Si estamos en modo supabase y tenemos la URI, la usamos
        if info.data.get("ENVIRONMENT") == "supabase":
            supabase_uri = info.data.get("SUPABASE_DATABASE_URI")
            if supabase_uri:
                return supabase_uri
            
        # Por defecto construimos la URI desde los componentes (local)
        return str(PostgresDsn.build(
            scheme="postgresql",
            username=info.data.get("POSTGRES_USER"),
            password=info.data.get("POSTGRES_PASSWORD"),
            host=info.data.get("POSTGRES_SERVER"),
            port=info.data.get("POSTGRES_PORT"),
            path=f"{info.data.get('POSTGRES_DB') or ''}",
        ))

    # Seguridad
    SECRET_KEY: str = "SUPER_SECRET_KEY_CAMBIAR_EN_PRODUCCION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Email / SMTP (Gmail sugerido)
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = "ShopList Pro"
    
    # Frontend URL para enlaces en correos
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS Origins
    BACKEND_CORS_ORIGINS: Any = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

settings = Settings()
