from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class FrequencyEnum(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    occasional = "occasional"

class ProductBase(BaseModel):
    name: str = Field(..., max_length=255)
    frequency: FrequencyEnum
    frequency_start_date: datetime

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    frequency: Optional[FrequencyEnum] = None
    frequency_start_date: Optional[datetime] = None
    is_deleted: Optional[bool] = None

# Store summary for nested use
class StoreSummary(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class PriceHistorySummary(BaseModel):
    price: float
    date: datetime
    model_config = ConfigDict(from_attributes=True)

class ProductStoreWithStore(BaseModel):
    id: int
    store_id: int
    price_catalog: float
    is_deleted: bool
    store: Optional[StoreSummary] = None
    price_history: List[PriceHistorySummary] = []
    model_config = ConfigDict(from_attributes=True)

class ProductOut(ProductBase):
    id: int
    user_id: int
    is_deleted: bool
    created_at: datetime
    product_stores: List[ProductStoreWithStore] = []

    model_config = ConfigDict(from_attributes=True)
