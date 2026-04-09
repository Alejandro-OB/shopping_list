from pydantic import BaseModel
from typing import List, Optional

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
