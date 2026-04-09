from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import pytest

from app.models.user import User
from app.models.product import Product, FrequencyEnum
from app.models.store import Store
from app.models.product_store import ProductStore
from app.models.shopping_list import ShoppingList, ListStatus
from app.models.shopping_list_item import ShoppingListItem
from app.models.price_history import PriceHistory

def test_user_creation(session):
    user = User(
        name="Juan Perez",
        email="juan@example.com",
        password="securepassword"
    )
    session.add(user)
    session.commit()
    assert user.id is not None
    assert user.name == "Juan Perez"
    assert user.can_autogenerate_lists is True

def test_product_and_store_creation(session):
    user = User(name="Test User", email="test@example.com", password="pwd")
    session.add(user)
    session.commit()

    store = Store(name="Exito", user=user)
    product = Product(
        name="Leche",
        frequency=FrequencyEnum.weekly,
        frequency_start_date=datetime.now(timezone.utc),
        user=user
    )
    session.add_all([store, product])
    session.commit()
    
    assert store.id is not None
    assert product.id is not None
    assert product.user_id == user.id

def test_product_store_relationship(session):
    user = User(name="Test User", email="test2@example.com", password="pwd")
    session.add(user)
    session.commit()
    
    store = Store(name="Exito", user=user)
    product = Product(
        name="Leche",
        frequency=FrequencyEnum.weekly,
        frequency_start_date=datetime.now(timezone.utc),
        user=user
    )
    session.add_all([store, product])
    session.commit()

    ps = ProductStore(
        product=product,
        store=store,
        price_catalog=5500.00
    )
    session.add(ps)
    session.commit()
    
    assert ps.id is not None
    assert ps.price_catalog == 5500.00

def test_unique_constraint_list_product(session):
    user = User(name="Test User", email="test3@example.com", password="pwd")
    session.add(user)
    session.commit()
    
    store = Store(name="Exito", user=user)
    product = Product(name="Leche", frequency=FrequencyEnum.weekly, frequency_start_date=datetime.now(timezone.utc), user=user)
    session.add_all([store, product])
    session.commit()

    ps = ProductStore(product=product, store=store, price_catalog=5500.00)
    session.add(ps)
    session.commit()

    shop_list = ShoppingList(user=user, name="Lista", date=datetime.now(timezone.utc))
    session.add(shop_list)
    session.commit()

    item1 = ShoppingListItem(shopping_list=shop_list, product_store=ps, quantity=2, price_catalog_snapshot=5500)
    session.add(item1)
    session.commit()

    item2 = ShoppingListItem(shopping_list=shop_list, product_store=ps, quantity=1, price_catalog_snapshot=5500)
    session.add(item2)
    
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()

def test_quantity_constraint(session):
    user = User(name="Test User", email="test4@example.com", password="pwd")
    session.add(user)
    session.commit()
    
    store = Store(name="Exito", user=user)
    product = Product(name="Leche", frequency=FrequencyEnum.weekly, frequency_start_date=datetime.now(timezone.utc), user=user)
    session.add_all([store, product])
    session.commit()

    ps = ProductStore(product=product, store=store, price_catalog=5500.00)
    session.add(ps)
    session.commit()

    shop_list = ShoppingList(user=user, name="Lista", date=datetime.now(timezone.utc))
    session.add(shop_list)
    session.commit()

    invalid_item = ShoppingListItem(shopping_list=shop_list, product_store=ps, quantity=0, price_catalog_snapshot=5500)
    session.add(invalid_item)
    
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()

def test_soft_delete(session):
    user = User(name="Test User", email="test5@example.com", password="pwd")
    session.add(user)
    
    product = Product(name="Leche", frequency=FrequencyEnum.weekly, frequency_start_date=datetime.now(timezone.utc), user=user)
    session.add(product)
    session.commit()

    product.is_deleted = True
    session.commit()

    stmt = select(Product).where(Product.id == product.id)
    prod_db = session.execute(stmt).scalar_one()
    assert prod_db.is_deleted is True

def test_price_history(session):
    user = User(name="Test User", email="test6@example.com", password="pwd")
    session.add(user)
    store = Store(name="Exito", user=user)
    product = Product(name="Leche", frequency=FrequencyEnum.weekly, frequency_start_date=datetime.now(timezone.utc), user=user)
    session.add_all([store, product])
    session.commit()

    ps = ProductStore(product=product, store=store, price_catalog=5500.00)
    session.add(ps)
    session.commit()

    history = PriceHistory(product_store=ps, price=5600.00, date=datetime.now(timezone.utc))
    session.add(history)
    session.commit()

    assert history.id is not None
    assert history.price == 5600.00
