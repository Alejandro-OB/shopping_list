from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings

# La URL se construye dinámicamente desde el objeto settings (Pydantic)
SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI

# Creamos el motor de base de datos (PostgreSQL no requiere connect_args={"check_same_thread": False})
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    Dependency para obtener una sesión de base de datos.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
