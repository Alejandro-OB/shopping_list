from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ProductQuantity(BaseModel):
    product_name: str
    total_quantity: int

class MonthlySpending(BaseModel):
    year: int
    month: int
    total: float

class BudgetSummary(BaseModel):
    total_lists: int
    total_products: int
    total_stores: int
    current_month_real_spending: float
    current_week_real_spending: float
    next_week_estimated_budget: float
    most_bought: List[ProductQuantity]

class PricePoint(BaseModel):
    week: str       # etiqueta semana ISO, ej. "2026-W23"
    date: datetime  # ShoppingList.date (para tooltip)
    price: float    # price_real pagado esa semana

class ProductPriceEvolution(BaseModel):
    product_store_id: int
    product_name: str
    store_name: str
    points: List[PricePoint]
