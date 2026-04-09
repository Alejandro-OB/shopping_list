from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.product import Product, FrequencyEnum
from app.models.store import Store
from app.models.product_store import ProductStore
from app.models.shopping_list import ShoppingList, ListStatus
from app.models.shopping_list_item import ShoppingListItem

def test_metrics_summary(client: TestClient, session: Session, test_user, auth_headers):
    """
    Test completo del dashboard de métricas.
    """
    # 1. Preparar datos: Tienda y Producto
    store = Store(name="Exito", user_id=test_user.id)
    product = Product(
        name="Leche", 
        frequency=FrequencyEnum.weekly, 
        frequency_start_date=datetime.now(timezone.utc),
        user_id=test_user.id
    )
    session.add_all([store, product])
    session.commit()

    ps = ProductStore(product_id=product.id, store_id=store.id, price_catalog=5000.0)
    session.add(ps)
    session.commit()

    # 2. Crear una lista real compradora HOY (Lunes 6 Abril 2026 en setup_db si fuera el caso)
    # Usaremos fechas relativas para que el test siempre funcione
    hoy = datetime.now(timezone.utc)
    
    shop_list = ShoppingList(user_id=test_user.id, name="Lista Real", date=hoy, status=ListStatus.completed)
    session.add(shop_list)
    session.commit()

    item = ShoppingListItem(
        list_id=shop_list.id,
        product_store_id=ps.id,
        quantity=2,
        price_catalog_snapshot=5000.0,
        price_real=5200.0, # Total real = 2 * 5200 = 10400
        checked=True
    )
    session.add(item)
    session.commit()

    # 3. Llamar al endpoint de métricas
    response = client.get("/api/v1/metrics/summary", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Gasto real actual del mes debería incluir los 10400
    assert data["current_month_real_spending"] >= 10400.0
    # Gasto semanal real debería incluir los 10400
    assert data["current_week_real_spending"] >= 10400.0
    # La estimación semanal debería existir basándose en la frecuencia
    assert data["next_week_estimated_budget"] >= 5000.0
    # Top productos comprados
    assert len(data["most_bought"]) > 0
    assert data["most_bought"][0]["product_name"] == "Leche"
