import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi.testclient import TestClient
from typing import Generator

from app.main import app
from app.core.db.base import Base
from app.core.db.session import get_db
from app.core.security import get_password_hash

# Base de datos SQLite en memoria para tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """
    Crea las tablas una sola vez por sesión de pruebas.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def session() -> Generator[Session, None, None]:
    """
    Proporciona una sesión de base de datos fresca por cada test.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(session: Session) -> Generator[TestClient, None, None]:
    """
    Cliente de pruebas que sobreescribe la dependencia get_db.
    """
    def override_get_db():
        yield session
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(session: Session):
    """
    Crea un usuario de prueba por defecto.
    """
    from app.models.user import User
    from app.core.security import get_password_hash
    user = User(
        name="Test User",
        email="test@example.com",
        password=get_password_hash("password123"),
        is_verified=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@pytest.fixture
def auth_headers(client: TestClient, test_user):
    """
    Proporciona cabeceras de autenticación válidas.
    """
    response = client.post(
        "/api/v1/login",
        json={"email": "test@example.com", "password": "password123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
