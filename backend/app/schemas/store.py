from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List

class StoreBase(BaseModel):
    name: str = Field(..., max_length=255)

class StoreCreate(StoreBase):
    pass

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    is_deleted: Optional[bool] = None

class StoreOut(StoreBase):
    id: int
    user_id: int
    is_deleted: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Relación entre producto y tienda
class ProductStoreBase(BaseModel):
    product_id: int
    store_id: int
    price_catalog: float = Field(..., ge=0)

class ProductStoreCreate(ProductStoreBase):
    pass

class ProductStoreOut(ProductStoreBase):
    id: int
    is_deleted: bool
    
    model_config = ConfigDict(from_attributes=True)
