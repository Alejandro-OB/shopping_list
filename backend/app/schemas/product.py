from pydantic import BaseModel, ConfigDict, Field, model_validator
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
    category: Optional[str] = Field(None, max_length=50)
    frequency: FrequencyEnum
    frequency_start_date: datetime
    # Inventario: stock nulo es "no se lleva inventario de este producto", que
    # no es lo mismo que cero. Ver el modelo Product.
    stock: Optional[float] = Field(None, ge=0)
    stock_min: float = Field(0, ge=0)
    units_per_purchase: float = Field(1, gt=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    frequency: Optional[FrequencyEnum] = None
    frequency_start_date: Optional[datetime] = None
    is_deleted: Optional[bool] = None
    stock: Optional[float] = Field(None, ge=0)
    stock_min: Optional[float] = Field(None, ge=0)
    units_per_purchase: Optional[float] = Field(None, gt=0)


class StockAdjust(BaseModel):
    """
    Ajuste de existencias. `delta` descuenta o repone sobre lo que haya (es lo
    que usa la merma de cada día) y `stock` fija un valor exacto, para cuando se
    cuenta lo que hay en casa. Exactamente uno de los dos.
    """
    delta: Optional[float] = None
    stock: Optional[float] = Field(None, ge=0)

    @model_validator(mode="after")
    def delta_xor_stock(self):
        if (self.delta is None) == (self.stock is None):
            raise ValueError("Debe enviar delta O stock (exactamente uno).")
        return self

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
