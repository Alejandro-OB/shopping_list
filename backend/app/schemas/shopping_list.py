from pydantic import BaseModel, ConfigDict, Field, computed_field
from datetime import datetime
from typing import Optional, List, Any
from enum import Enum

class ListStatus(str, Enum):
    draft = "draft"
    active = "active"
    completed = "completed"

# Item de la lista
class ShoppingListItemBase(BaseModel):
    product_store_id: int
    quantity: int = Field(..., ge=1)

class ShoppingListItemCreate(ShoppingListItemBase):
    pass

class ShoppingListItemUpdate(BaseModel):
    checked: Optional[bool] = None
    price_real: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=1)

class ShoppingListItemOut(ShoppingListItemBase):
    id: int
    list_id: int
    checked: bool
    price_catalog_snapshot: float
    price_real: float

    # Campo interno para alimentar los computed_fields, excluido de la respuesta JSON
    product_store: Any = Field(None, exclude=True)
    
    @computed_field
    def product_name(self) -> str:
        return self.product_store.product.name

    @computed_field
    def store_name(self) -> str:
        return self.product_store.store.name

    model_config = ConfigDict(from_attributes=True)

# Lista de compras
class ShoppingListBase(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    date: datetime

class ShoppingListCreate(ShoppingListBase):
    pass

class ShoppingListManualCreate(BaseModel):
    name: str = Field(..., max_length=255)
    date: datetime
    items: List[ShoppingListItemCreate] = Field(..., min_length=1)

class ShoppingListUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[ListStatus] = None

class ShoppingListOut(ShoppingListBase):
    id: int
    user_id: int
    status: ListStatus
    is_auto_generated: bool
    items: List[ShoppingListItemOut] = []
    
    model_config = ConfigDict(from_attributes=True)
