import pytest
from datetime import datetime, timedelta, timezone
from app.services.logic.frequency import calculate_next_occurrence
from app.core.timezone import BOGOTA_TZ, get_week_bounds, tuesday_of_week
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


def test_week_bounds_and_tuesday_anchor():
    """
    get_week_bounds/tuesday_of_week deben coincidir con getWeekStart() del
    frontend: lunes 00:00 a domingo 23:59:59, y el martes de esa misma semana.
    """
    thursday = BOGOTA_TZ.localize(datetime(2026, 4, 9, 15, 30))  # Jueves 9 abril 2026

    monday, sunday_end = get_week_bounds(thursday)
    assert (monday.year, monday.month, monday.day) == (2026, 4, 6)
    assert monday.hour == 0 and monday.minute == 0 and monday.second == 0
    assert (sunday_end.year, sunday_end.month, sunday_end.day) == (2026, 4, 12)
    assert sunday_end.hour == 23 and sunday_end.minute == 59

    tuesday = tuesday_of_week(thursday)
    assert (tuesday.year, tuesday.month, tuesday.day) == (2026, 4, 7)
    assert tuesday.weekday() == 1


def test_weekly_and_biweekly_products_share_one_weekly_list(session):
    """
    Reproduce el bug reportado: un producto weekly (vence el martes) y uno
    biweekly cuya ocurrencia cae el jueves de esa misma semana no deben
    generar dos listas-borrador distintas — deben quedar en UNA sola lista
    semanal, sin importar en qué día del scheduler diario haya corrido cada
    uno.
    """
    from app.services.shopping_list_service import ShoppingListService
    from app.models.user import User
    from app.models.product import Product
    from app.models.store import Store
    from app.models.product_store import ProductStore
    from app.models.shopping_list import ShoppingList

    user = User(name="T", email="t2@e.com", password="p", is_verified=True)
    store = Store(name="S", user=user)
    session.add_all([user, store])
    session.commit()

    # Semana del 6 al 12 de abril de 2026 (lunes a domingo)
    tuesday_utc = datetime(2026, 4, 7, 12, 0, tzinfo=timezone.utc)   # martes
    thursday_utc = datetime(2026, 4, 9, 12, 0, tzinfo=timezone.utc)  # jueves, misma semana

    weekly_product = Product(name="Weekly", frequency=FrequencyEnum.weekly, frequency_start_date=tuesday_utc, user=user)
    biweekly_product = Product(name="Biweekly", frequency=FrequencyEnum.biweekly, frequency_start_date=thursday_utc, user=user)
    session.add_all([weekly_product, biweekly_product])
    session.commit()

    session.add_all([
        ProductStore(product=weekly_product, store=store, price_catalog=1000),
        ProductStore(product=biweekly_product, store=store, price_catalog=2000),
    ])
    session.commit()

    service = ShoppingListService(session)

    # Día 1: corrida del scheduler el martes — solo el producto weekly vence hoy
    ref_tuesday = BOGOTA_TZ.localize(datetime(2026, 4, 7, 0, 5))
    result_tue = service.generate_auto_lists(user.id, reference_date_bogota=ref_tuesday)
    assert result_tue["lists_created"] == 1
    assert result_tue["items_added"] == 1

    # Día 2: corrida del scheduler el jueves de la MISMA semana — solo el
    # producto biweekly vence hoy. Antes del fix, esto creaba una segunda
    # lista-borrador con un solo ítem; ahora debe sumarse a la del martes.
    ref_thursday = BOGOTA_TZ.localize(datetime(2026, 4, 9, 0, 5))
    result_thu = service.generate_auto_lists(user.id, reference_date_bogota=ref_thursday)
    assert result_thu["lists_created"] == 0
    assert result_thu["items_added"] == 1

    all_lists = session.query(ShoppingList).filter(ShoppingList.user_id == user.id).all()
    assert len(all_lists) == 1
    assert len(all_lists[0].items) == 2
