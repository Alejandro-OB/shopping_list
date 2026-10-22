from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.product import Product, FrequencyEnum
from app.models.store import Store
from app.models.product_store import ProductStore
from app.models.shopping_list import ShoppingList, ListStatus
from app.models.shopping_list_item import ShoppingListItem

API = "/api/v1/lists"


def _list_with_item(session: Session, user, *, date=None, stock=None):
    """Lista activa del usuario con un producto vinculado a una tienda."""
    store = Store(name="Exito", user_id=user.id)
    product = Product(
        name="Leche",
        frequency=FrequencyEnum.occasional,
        frequency_start_date=datetime.now(timezone.utc),
        user_id=user.id,
        stock=stock,
    )
    session.add_all([store, product])
    session.commit()

    ps = ProductStore(product_id=product.id, store_id=store.id, price_catalog=5000.0)
    session.add(ps)
    session.commit()

    shop_list = ShoppingList(
        user_id=user.id,
        name="Semana",
        date=date or datetime.now(timezone.utc),
        status=ListStatus.active,
    )
    session.add(shop_list)
    session.commit()

    item = ShoppingListItem(
        list_id=shop_list.id,
        product_store_id=ps.id,
        quantity=1,
        price_catalog_snapshot=5000.0,
        price_real=0,
    )
    session.add(item)
    session.commit()
    return shop_list, item


# ── En la cesta ──────────────────────────────────────────────────────────────

def test_item_goes_in_and_out_of_the_cart(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que un ítem pueda ponerse en la cesta y sacarse sin quedar comprado.
    """
    _, item = _list_with_item(session, test_user)

    res = client.patch(f"{API}/items/{item.id}/", json={"in_cart": True}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["in_cart"] is True
    assert res.json()["checked"] is False

    res = client.patch(f"{API}/items/{item.id}/", json={"in_cart": False}, headers=auth_headers)
    assert res.json()["in_cart"] is False


def test_paying_takes_the_item_out_of_the_cart(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que marcar como comprado quite la marca de la cesta.
    """
    _, item = _list_with_item(session, test_user)
    client.patch(f"{API}/items/{item.id}/", json={"in_cart": True}, headers=auth_headers)

    res = client.patch(f"{API}/items/{item.id}/check/", json={"price_real": 5200}, headers=auth_headers)

    assert res.status_code == 200
    assert res.json()["checked"] is True
    assert res.json()["in_cart"] is False


def test_bought_item_cannot_go_back_to_the_cart(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que un ítem ya pagado no pueda volver a la cesta.
    """
    _, item = _list_with_item(session, test_user)
    client.patch(f"{API}/items/{item.id}/check/", json={"price_real": 5200}, headers=auth_headers)

    res = client.patch(f"{API}/items/{item.id}/", json={"in_cart": True}, headers=auth_headers)

    assert res.status_code == 400


# ── Archivar ─────────────────────────────────────────────────────────────────

def test_archived_list_leaves_the_listing(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que una lista archivada salga del listado normal y aparezca en el de archivadas.
    """
    shop_list, _ = _list_with_item(session, test_user)

    res = client.post(f"{API}/{shop_list.id}/archive/", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["archived_at"] is not None

    active_ids = [l["id"] for l in client.get(f"{API}/", headers=auth_headers).json()]
    archived_ids = [l["id"] for l in client.get(f"{API}/?archived=true", headers=auth_headers).json()]
    assert shop_list.id not in active_ids
    assert shop_list.id in archived_ids


def test_unarchive_restores_the_previous_status(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que restaurar devuelva la lista al listado con el estado que tenía.
    """
    shop_list, _ = _list_with_item(session, test_user)
    client.post(f"{API}/{shop_list.id}/archive/", headers=auth_headers)

    res = client.post(f"{API}/{shop_list.id}/unarchive/", headers=auth_headers)

    assert res.status_code == 200
    assert res.json()["archived_at"] is None
    assert res.json()["status"] == "active"
    active_ids = [l["id"] for l in client.get(f"{API}/", headers=auth_headers).json()]
    assert shop_list.id in active_ids


def test_completed_list_can_be_archived(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que una lista completada, que no se puede borrar, sí se pueda archivar.
    """
    shop_list, _ = _list_with_item(session, test_user)
    shop_list.status = ListStatus.completed
    session.commit()

    res = client.post(f"{API}/{shop_list.id}/archive/", headers=auth_headers)

    assert res.status_code == 200


def test_archived_list_is_read_only(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que una lista archivada no admita cambios en sus ítems ni en ella.
    """
    shop_list, item = _list_with_item(session, test_user)
    client.post(f"{API}/{shop_list.id}/archive/", headers=auth_headers)

    assert client.patch(f"{API}/items/{item.id}/", json={"quantity": 2}, headers=auth_headers).status_code == 400
    assert client.patch(f"{API}/items/{item.id}/check/", json={"price_real": 10}, headers=auth_headers).status_code == 400
    assert client.delete(f"{API}/items/{item.id}/", headers=auth_headers).status_code == 400
    assert client.patch(f"{API}/{shop_list.id}/", json={"name": "Otra"}, headers=auth_headers).status_code == 400
    assert client.post(f"{API}/{shop_list.id}/complete/", headers=auth_headers).status_code == 400


def test_archived_list_frees_its_week(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que archivar la lista de una semana permita crear otra para esa misma semana.
    """
    date = datetime(2026, 10, 21, 12, 0, tzinfo=timezone.utc)
    shop_list, item = _list_with_item(session, test_user, date=date)
    payload = {
        "name": "Reemplazo",
        "date": (date + timedelta(days=1)).isoformat(),
        "items": [{"free_name": "Pan", "quantity": 1}],
    }

    assert client.post(f"{API}/", json=payload, headers=auth_headers).status_code == 409

    client.post(f"{API}/{shop_list.id}/archive/", headers=auth_headers)

    assert client.post(f"{API}/", json=payload, headers=auth_headers).status_code == 200


def test_auto_generation_leaves_an_archived_week_alone(session: Session, test_user):
    """
    Test que el generador no agregue ítems a la lista archivada ni cree otra esa semana.
    """
    from app.services.shopping_list_service import ShoppingListService
    from app.core.timezone import BOGOTA_TZ, tuesday_of_week, to_utc

    today = BOGOTA_TZ.localize(datetime(2026, 10, 22, 0, 5))
    # Sin existencias: el producto entra hoy sí o sí.
    shop_list, item = _list_with_item(
        session, test_user, date=to_utc(tuesday_of_week(today)), stock=0
    )
    session.delete(item)
    shop_list.archived_at = datetime.now(timezone.utc)
    session.commit()

    results = ShoppingListService(session).generate_auto_lists(test_user.id, reference_date_bogota=today)

    assert results["lists_created"] == 0
    assert results["items_added"] == 0
    session.refresh(shop_list)
    assert shop_list.items == []


# ── Generación ───────────────────────────────────────────────────────────────

def test_generation_considers_every_product_past_one_hundred(session: Session, test_user):
    """
    Test que la generación vea todos los productos aunque pasen de 100.
    """
    from app.services.shopping_list_service import ShoppingListService
    from app.core.timezone import BOGOTA_TZ

    store = Store(name="Exito", user_id=test_user.id)
    session.add(store)
    session.commit()
    # 120 productos sin existencias: todos deben entrar hoy.
    for n in range(120):
        product = Product(
            name=f"P{n}",
            frequency=FrequencyEnum.occasional,
            frequency_start_date=datetime.now(timezone.utc),
            user_id=test_user.id,
            stock=0,
        )
        session.add(product)
        session.flush()
        session.add(ProductStore(product_id=product.id, store_id=store.id, price_catalog=100))
    session.commit()

    today = BOGOTA_TZ.localize(datetime(2026, 10, 22, 0, 5))
    results = ShoppingListService(session).generate_auto_lists(test_user.id, reference_date_bogota=today)

    assert results["items_added"] == 120


def test_generate_endpoint_only_touches_the_caller(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que el botón de generar no cree listas en cuentas ajenas.
    """
    from app.models.user import User

    other = User(name="Otro", email="otro@example.com", password="x", is_verified=True)
    session.add(other)
    session.commit()
    _list_with_item(session, other, stock=0)
    session.query(ShoppingList).filter(ShoppingList.user_id == other.id).delete()
    session.commit()

    client.post(f"{API}/generate/", headers=auth_headers)

    assert session.query(ShoppingList).filter(ShoppingList.user_id == other.id).count() == 0


# ── Completar pasando lo pendiente ───────────────────────────────────────────

def test_complete_carries_pending_items_to_a_new_list(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que al completar con carry_over lo no comprado pase a una lista nueva.
    """
    shop_list, item = _list_with_item(session, test_user, date=datetime(2026, 10, 20, 5, tzinfo=timezone.utc))
    bought = ShoppingListItem(list_id=shop_list.id, free_name="Pan", quantity=1, price_real=2000, checked=True)
    session.add(bought)
    session.commit()

    res = client.post(f"{API}/{shop_list.id}/complete/", json={"carry_over": True}, headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["carried_over_count"] == 1
    assert [i["product_name"] for i in data["items"]] == ["Pan"]
    target = client.get(f"{API}/{data['carried_over_list_id']}/", headers=auth_headers).json()
    assert [i["product_name"] for i in target["items"]] == ["Leche"]
    assert target["status"] == "draft"


def test_complete_carry_over_reuses_next_open_list_without_duplicates(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que lo pendiente vaya a la siguiente lista abierta y no duplique productos.
    """
    shop_list, item = _list_with_item(session, test_user, date=datetime(2026, 10, 13, 5, tzinfo=timezone.utc))
    free = ShoppingListItem(list_id=shop_list.id, free_name="Pan", quantity=1, price_real=0)
    session.add(free)
    nxt = ShoppingList(user_id=test_user.id, name="Siguiente", date=datetime(2026, 10, 20, 5, tzinfo=timezone.utc), status=ListStatus.draft)
    session.add(nxt)
    session.commit()
    # La siguiente ya trae la leche: solo debe pasar el pan.
    session.add(ShoppingListItem(list_id=nxt.id, product_store_id=item.product_store_id, quantity=1, price_real=0))
    session.commit()

    data = client.post(f"{API}/{shop_list.id}/complete/", json={"carry_over": True}, headers=auth_headers).json()

    assert data["carried_over_list_id"] == nxt.id
    assert data["carried_over_count"] == 1
    target = client.get(f"{API}/{nxt.id}/", headers=auth_headers).json()
    assert sorted(i["product_name"] for i in target["items"]) == ["Leche", "Pan"]


def test_complete_without_carry_over_keeps_items(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que completar sin carry_over deje los pendientes en su lista, como antes.
    """
    shop_list, _ = _list_with_item(session, test_user)

    data = client.post(f"{API}/{shop_list.id}/complete/", headers=auth_headers).json()

    assert data["carried_over_count"] == 0
    assert len(data["items"]) == 1


# ── Presupuesto ──────────────────────────────────────────────────────────────

def test_budget_can_be_set_and_cleared(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test que el presupuesto se pueda poner y quitar.
    """
    shop_list, _ = _list_with_item(session, test_user)

    res = client.patch(f"{API}/{shop_list.id}/", json={"budget": 150000}, headers=auth_headers)
    assert res.json()["budget"] == 150000

    res = client.patch(f"{API}/{shop_list.id}/", json={"budget": None}, headers=auth_headers)
    assert res.json()["budget"] is None


def test_manual_generation_catches_up_on_the_week(session: Session, test_user):
    """
    Test que generar a mano un jueves agregue los semanales que vencían el martes.
    """
    from app.services.shopping_list_service import ShoppingListService
    from app.core.timezone import BOGOTA_TZ

    store = Store(name="Exito", user_id=test_user.id)
    product = Product(
        name="Carne",
        frequency=FrequencyEnum.weekly,
        frequency_start_date=datetime(2026, 10, 6, 5, tzinfo=timezone.utc),  # un martes
        user_id=test_user.id,
    )
    session.add_all([store, product])
    session.commit()
    session.add(ProductStore(product_id=product.id, store_id=store.id, price_catalog=100))
    session.commit()

    thursday = BOGOTA_TZ.localize(datetime(2026, 10, 22, 10, 0))
    service = ShoppingListService(session)

    assert service.generate_auto_lists(test_user.id, reference_date_bogota=thursday)["items_added"] == 0
    assert service.generate_auto_lists(test_user.id, reference_date_bogota=thursday, catch_up=True)["items_added"] == 1


def test_generation_leaves_a_completed_week_alone(session: Session, test_user):
    """
    Test que el generador no agregue ítems a la lista de la semana ya completada.
    """
    from app.services.shopping_list_service import ShoppingListService
    from app.core.timezone import BOGOTA_TZ, tuesday_of_week, to_utc

    today = BOGOTA_TZ.localize(datetime(2026, 10, 22, 0, 5))
    shop_list, item = _list_with_item(session, test_user, date=to_utc(tuesday_of_week(today)), stock=0)
    session.delete(item)
    shop_list.status = ListStatus.completed
    session.commit()

    results = ShoppingListService(session).generate_auto_lists(test_user.id, reference_date_bogota=today)

    assert results["items_added"] == 0
    assert results["lists_created"] == 0
