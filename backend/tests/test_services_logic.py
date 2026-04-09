import pytest
from datetime import datetime, timedelta, timezone
from app.services.logic.frequency import calculate_next_occurrence
from app.models.product import FrequencyEnum

def test_frequency_weekly_alignment():
    """
    Test que la frecuencia semanal se alinee al siguiente MARTES (Weekday 1).
    """
    # Lunes 6 de Abril 2026 -> Debería ser Martes 7 de Abril
    start_date = datetime(2026, 4, 6, 12, 0, tzinfo=timezone.utc)
    current_date = start_date
    
    next_date = calculate_next_occurrence(FrequencyEnum.weekly, start_date, current_date, strict=True)
    
    assert next_date.weekday() == 1 # Tuesday
    assert next_date.day == 7
    assert next_date.month == 4

def test_frequency_biweekly():
    """
    Test que la frecuencia quincenal sume exactamente 15 días.
    """
    start_date = datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc)
    current_date = start_date
    
    next_date = calculate_next_occurrence(FrequencyEnum.biweekly, start_date, current_date, strict=True)
    
    # 1 + 15 = 16
    assert next_date.day == 16
    assert next_date.month == 4

def test_frequency_monthly():
    """
    Test que la frecuencia mensual sume exactamente 30 días.
    """
    start_date = datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc)
    current_date = start_date
    
    next_date = calculate_next_occurrence(FrequencyEnum.monthly, start_date, current_date, strict=True)
    
    # 1 + 30 = 31 (Abril tiene 30 días, así que cae en 1 de Mayo)
    assert next_date.day == 1
    assert next_date.month == 5

def test_no_generation_if_future(session):
    """
    Test que no se genere nada si el cálculo de frecuencia arroja una fecha futura (mañana).
    """
    from app.services.shopping_list_service import ShoppingListService
    from app.models.user import User
    from app.models.product import Product
    from app.models.store import Store
    from app.models.product_store import ProductStore
    
    user = User(name="T", email="t@e.com", password="p", is_verified=True)
    session.add(user)
    session.commit()
    
    # Mañana (Fecha futura)
    start_date = datetime.now(timezone.utc) + timedelta(days=1)
    
    product = Product(name="P", frequency=FrequencyEnum.weekly, frequency_start_date=start_date, user=user)
    store = Store(name="S", user=user)
    session.add_all([product, store])
    session.commit()
    
    ps = ProductStore(product=product, store=store, price_catalog=100)
    session.add(ps)
    session.commit()
    
    service = ShoppingListService(session)
    lists_created = service.generate_auto_lists(user.id)
    
    assert len(lists_created) == 0
