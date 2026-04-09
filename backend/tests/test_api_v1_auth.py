from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.action_token import ActionToken, ActionTokenType

def test_register_user(client: TestClient):
    """
    Test que el registro de usuario cree un usuario no verificado.
    """
    response = client.post(
        "/api/v1/users/",
        json={"name": "Alice", "email": "alice@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert data["is_verified"] is False

def test_login_user(client: TestClient, session: Session):
    """
    Test que el login devuelva tokens válidos.
    """
    # Creamos usuario manualmente (usando password hasheado de fixture o directo)
    from app.core.security import get_password_hash
    user = User(name="Bob", email="bob@example.com", password=get_password_hash("test-pwd"), is_verified=True)
    session.add(user)
    session.commit()

    response = client.post(
        "/api/v1/login",
        json={"email": "bob@example.com", "password": "test-pwd"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_verify_email_flow(client: TestClient, session: Session):
    """
    Test que el endpoint de verificación active la cuenta.
    """
    # 1. Crear usuario no verificado
    from app.core.security import get_password_hash
    user = User(name="VerifyMe", email="v@e.com", password=get_password_hash("pwd"), is_verified=False)
    session.add(user)
    session.commit()

    # 2. Crear token de verificación
    from datetime import datetime, timezone, timedelta
    token_str = "secret-verify-token"
    at = ActionToken(
        user_id=user.id,
        token=token_str,
        type=ActionTokenType.VERIFICATION,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    session.add(at)
    session.commit()

    # 3. Llamar al endpoint
    response = client.get(f"/api/v1/users/verify?token={token_str}")
    
    assert response.status_code == 200
    session.refresh(user)
    assert user.is_verified is True
    
    # 4. Token debe estar marcado como usado
    session.refresh(at)
    assert at.is_used is True

def test_login_invalid_password(client: TestClient):
    """
    Test que login falle con clave errónea.
    """
    response = client.post(
        "/api/v1/login",
        json={"email": "bob@example.com", "password": "wrong"}
    )
    assert response.status_code == 401
