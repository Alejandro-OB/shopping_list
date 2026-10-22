from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.product import Product, FrequencyEnum
from app.models.user import User

API = "/api/v1/household"


def _second_user(client: TestClient, session: Session, email="novia@example.com"):
    user = User(name="Novia", email=email, password=get_password_hash("password123"), is_verified=True)
    session.add(user)
    session.commit()
    token = client.post("/api/v1/login", json={"email": email, "password": "password123"}).json()["access_token"]
    return user, {"Authorization": f"Bearer {token}"}


def _join(client, owner_headers, member_headers):
    code = client.post(f"{API}/invite/", headers=owner_headers).json()["invite_code"]
    return client.post(f"{API}/join/", json={"code": code}, headers=member_headers)


def test_member_sees_and_uses_the_owner_catalog(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que quien se une al hogar vea los productos del dueño y cree listas con ellos.
    """
    session.add(Product(name="Leche", frequency=FrequencyEnum.weekly,
                        frequency_start_date=datetime.now(timezone.utc), user_id=test_user.id))
    session.commit()
    member, member_headers = _second_user(client, session)

    assert client.get("/api/v1/products/", headers=member_headers).json() == []

    res = _join(client, auth_headers, member_headers)
    assert res.status_code == 200
    assert res.json()["role"] == "member"

    names = [p["name"] for p in client.get("/api/v1/products/", headers=member_headers).json()]
    assert names == ["Leche"]

    # Lo que crea el miembro queda en el hogar del dueño.
    client.post("/api/v1/stores/", json={"name": "D1"}, headers=member_headers)
    owner_stores = [s["name"] for s in client.get("/api/v1/stores/", headers=auth_headers).json()]
    assert "D1" in owner_stores


def test_invite_code_is_single_use(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que un código sirva una sola vez.
    """
    _, first = _second_user(client, session)
    _, second = _second_user(client, session, email="otra@example.com")
    code = client.post(f"{API}/invite/", headers=auth_headers).json()["invite_code"]

    assert client.post(f"{API}/join/", json={"code": code}, headers=first).status_code == 200
    assert client.post(f"{API}/join/", json={"code": code}, headers=second).status_code == 400


def test_expired_code_is_rejected(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que un código vencido no sirva.
    """
    _, member_headers = _second_user(client, session)
    code = client.post(f"{API}/invite/", headers=auth_headers).json()["invite_code"]
    test_user.household_invite_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    session.commit()

    assert client.post(f"{API}/join/", json={"code": code}, headers=member_headers).status_code == 400


def test_code_is_forgiving_with_case_and_separators(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que el código se acepte en minúsculas y con guiones o espacios.
    """
    _, member_headers = _second_user(client, session)
    code = client.post(f"{API}/invite/", headers=auth_headers).json()["invite_code"]
    typed = f" {code[:4].lower()}-{code[4:]} "

    assert client.post(f"{API}/join/", json={"code": typed}, headers=member_headers).status_code == 200


def test_leaving_returns_to_own_data(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que al salir del hogar se vuelva a los datos propios.
    """
    session.add(Product(name="Leche", frequency=FrequencyEnum.weekly,
                        frequency_start_date=datetime.now(timezone.utc), user_id=test_user.id))
    session.commit()
    _, member_headers = _second_user(client, session)
    _join(client, auth_headers, member_headers)

    res = client.post(f"{API}/leave/", headers=member_headers)

    assert res.json()["role"] == "owner"
    assert client.get("/api/v1/products/", headers=member_headers).json() == []


def test_owner_can_remove_a_member(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que el dueño pueda sacar a alguien de su hogar.
    """
    member, member_headers = _second_user(client, session)
    _join(client, auth_headers, member_headers)

    res = client.delete(f"{API}/members/{member.id}/", headers=auth_headers)

    assert res.json()["members"] == []
    assert client.get(f"{API}/", headers=member_headers).json()["role"] == "owner"


def test_member_cannot_invite_and_owner_with_members_cannot_join(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que el hogar tenga un solo nivel.
    """
    _, member_headers = _second_user(client, session)
    _join(client, auth_headers, member_headers)
    _, third_headers = _second_user(client, session, email="tercero@example.com")

    assert client.post(f"{API}/invite/", headers=member_headers).status_code == 400

    third_code = client.post(f"{API}/invite/", headers=third_headers).json()["invite_code"]
    assert client.post(f"{API}/join/", json={"code": third_code}, headers=auth_headers).status_code == 400


def test_member_lists_are_generated_for_the_household(session: Session, test_user):
    """
    Test que la corrida general no genere listas para los miembros por su cuenta.
    """
    from app.services.shopping_list_service import ShoppingListService
    from app.models.store import Store
    from app.models.product_store import ProductStore
    from app.models.shopping_list import ShoppingList
    from app.core.timezone import BOGOTA_TZ

    member = User(name="Novia", email="m@example.com", password="x", is_verified=True,
                  household_owner_id=test_user.id)
    session.add(member)
    session.commit()
    # El miembro tiene un producto propio, dormido mientras comparte hogar.
    store = Store(name="S", user_id=member.id)
    product = Product(name="Suyo", frequency=FrequencyEnum.occasional, stock=0,
                      frequency_start_date=datetime.now(timezone.utc), user_id=member.id)
    session.add_all([store, product])
    session.commit()
    session.add(ProductStore(product_id=product.id, store_id=store.id, price_catalog=1))
    session.commit()

    ShoppingListService(session).generate_auto_lists(
        reference_date_bogota=BOGOTA_TZ.localize(datetime(2026, 10, 22, 0, 5))
    )

    assert session.query(ShoppingList).filter(ShoppingList.user_id == member.id).count() == 0
