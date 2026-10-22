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
