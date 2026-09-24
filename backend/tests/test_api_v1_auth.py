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


# ── Autorización sobre vínculos producto-tienda ──────────────────────────────
# Estos tres endpoints buscaban por id y actuaban sin mirar de quién era el
# vínculo, así que con un id numérico se podía tocar el catálogo ajeno.

def _other_users_product_store(session: Session):
    """Vínculo producto-tienda de un usuario distinto al autenticado."""
    from datetime import datetime, timezone
    from app.models.product import Product, FrequencyEnum
    from app.models.store import Store
    from app.models.product_store import ProductStore
    from app.core.security import get_password_hash

    other = User(name="Otro", email="otro@example.com", password=get_password_hash("x"), is_verified=True)
    session.add(other)
    session.commit()
    product = Product(
        name="Ajeno", frequency=FrequencyEnum.weekly,
        frequency_start_date=datetime.now(timezone.utc), user=other,
    )
    store = Store(name="Tienda ajena", user=other)
    session.add_all([product, store])
    session.commit()
    ps = ProductStore(product=product, store=store, price_catalog=1000)
    session.add(ps)
    session.commit()
    return ps


def test_cannot_change_price_of_another_users_link(client: TestClient, session: Session, auth_headers):
    """
    Test que no se pueda cambiar el precio de un vínculo ajeno.
    """
    ps = _other_users_product_store(session)

    response = client.patch(
        f"/api/v1/stores/product-store/{ps.id}/",
        json={"price_catalog": 1},
        headers=auth_headers,
    )

    assert response.status_code == 404
    session.refresh(ps)
    assert float(ps.price_catalog) == 1000


def test_cannot_delete_another_users_link(client: TestClient, session: Session, auth_headers):
    """
    Test que no se pueda borrar un vínculo ajeno.
    """
    ps = _other_users_product_store(session)

    response = client.delete(
        f"/api/v1/stores/product-store/{ps.id}/",
        headers=auth_headers,
    )

    assert response.status_code == 404
    session.refresh(ps)
    assert ps.is_deleted is False


def test_cannot_link_a_store_to_another_users_product(client: TestClient, session: Session, auth_headers, test_user):
    """
    Test que no se pueda vincular nada a un producto ajeno.
    """
    from app.models.store import Store
    ps = _other_users_product_store(session)
    my_store = Store(name="Mi tienda", user=test_user)
    session.add(my_store)
    session.commit()

    response = client.post(
        "/api/v1/stores/product-store/",
        json={"product_id": ps.product_id, "store_id": my_store.id, "price_catalog": 500},
        headers=auth_headers,
    )

    assert response.status_code == 404


# ── Un producto no existe sin tienda ─────────────────────────────────────────

def test_product_requires_at_least_one_store(client: TestClient, auth_headers):
    """
    Test que no se pueda crear un producto sin ninguna tienda.
    """
    from datetime import datetime, timezone
    response = client.post(
        "/api/v1/products/",
        json={
            "name": "Suelto",
            "frequency": "weekly",
            "frequency_start_date": datetime.now(timezone.utc).isoformat(),
            "stores": [],
        },
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_cannot_unlink_the_last_store_of_a_product(client: TestClient, session: Session, auth_headers, test_user):
    """
    Test que no se pueda quitar la única tienda de un producto.
    """
    from datetime import datetime, timezone
    from app.models.product import Product, FrequencyEnum
    from app.models.store import Store
    from app.models.product_store import ProductStore

    product = Product(
        name="Con una sola", frequency=FrequencyEnum.weekly,
        frequency_start_date=datetime.now(timezone.utc), user=test_user,
    )
    store = Store(name="Única", user=test_user)
    session.add_all([product, store])
    session.commit()
    ps = ProductStore(product=product, store=store, price_catalog=100)
    session.add(ps)
    session.commit()

    response = client.delete(f"/api/v1/stores/product-store/{ps.id}/", headers=auth_headers)

    assert response.status_code == 400
    session.refresh(ps)
    assert ps.is_deleted is False
