from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.action_token import ActionToken, ActionTokenType

def test_register_user(client: TestClient):
    """
    Test que el registro de usuario cree un usuario no verificado.

    La contraseña cumple las reglas de UserCreate —ocho caracteres, mayúscula,
    número y símbolo—; con una que no las cumpla el registro responde 422, que
    es lo que comprueba test_register_rejects_weak_password.
    """
    response = client.post(
        "/api/v1/users/",
        json={"name": "Alice", "email": "alice@example.com", "password": "Password123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert data["is_verified"] is False

def test_register_rejects_weak_password(client: TestClient):
    """
    Test que el registro rechace una contraseña que no cumpla las reglas.
    """
    response = client.post(
        "/api/v1/users/",
        json={"name": "Weak", "email": "weak@example.com", "password": "password123"}
    )
    assert response.status_code == 422

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

def test_login_unknown_email_looks_like_wrong_password(client: TestClient, session: Session):
    """
    Test que un correo sin cuenta responda igual que una contraseña errónea.

    Si se distinguieran, bastaría con probar correos para saber cuáles están
    registrados.
    """
    from app.core.security import get_password_hash
    user = User(name="Bob", email="bob@example.com", password=get_password_hash("test-pwd"), is_verified=True)
    session.add(user)
    session.commit()

    unknown = client.post(
        "/api/v1/login",
        json={"email": "nadie@example.com", "password": "test-pwd"}
    )
    wrong_password = client.post(
        "/api/v1/login",
        json={"email": "bob@example.com", "password": "wrong"}
    )

    assert unknown.status_code == wrong_password.status_code == 401
    assert unknown.json()["detail"] == wrong_password.json()["detail"]

def test_login_invalid_password(client: TestClient, session: Session):
    """
    Test que login falle con clave errónea.
    """
    # El usuario se crea aquí y no se toma prestado el de test_login_user: cada
    # test corre en una transacción que se revierte al terminar, así que aquel
    # bob no existe cuando este corre y el login respondía 404, no 401.
    from app.core.security import get_password_hash
    user = User(name="Bob", email="bob@example.com", password=get_password_hash("test-pwd"), is_verified=True)
    session.add(user)
    session.commit()

    response = client.post(
        "/api/v1/login",
        json={"email": "bob@example.com", "password": "wrong"}
    )
    assert response.status_code == 401
