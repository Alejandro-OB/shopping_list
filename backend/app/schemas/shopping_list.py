from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator
from datetime import datetime
from typing import Optional, List, Any
from enum import Enum
from app.core.timezone import to_utc

class ListStatus(str, Enum):
    draft = "draft"
    active = "active"
    completed = "completed"

# Item de la lista
class ShoppingListItemCreate(BaseModel):
    product_store_id: Optional[int] = None
    free_name: Optional[str] = Field(None, min_length=1, max_length=255)
    quantity: int = Field(..., ge=1)
    price: Optional[float] = Field(None, ge=0)  # precio opcional para items libres

    @model_validator(mode="after")
    def linked_xor_free(self):
        # Exactamente uno de product_store_id o free_name debe estar presente
        if (self.product_store_id is None) == (self.free_name is None):
            raise ValueError(
                "Debe especificar product_store_id O free_name (exactamente uno)."
            )
        return self

class ShoppingListItemUpdate(BaseModel):
    checked: Optional[bool] = None
    price_real: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=1)

class ShoppingListItemOut(BaseModel):
    id: int
    list_id: int
    product_store_id: Optional[int] = None
    free_name: Optional[str] = None
    quantity: int
    checked: bool
    price_catalog_snapshot: Optional[float] = None
    price_real: float

    # Campo interno para alimentar los computed_fields, excluido de la respuesta JSON
    product_store: Any = Field(None, exclude=True)

    @computed_field
    def product_name(self) -> str:
        if self.product_store and getattr(self.product_store, "product", None):
            return self.product_store.product.name
        return self.free_name or "—"

    @computed_field
    def store_name(self) -> Optional[str]:
        if self.product_store and getattr(self.product_store, "store", None):
            return self.product_store.store.name
        return None  # señal de "producto libre" al frontend

    @computed_field
    def is_free(self) -> bool:
        return self.product_store_id is None

    model_config = ConfigDict(from_attributes=True)

# Lista de compras
class ShoppingListBase(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    date: datetime

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v: Any) -> datetime:
        if isinstance(v, str):
            v = datetime.fromisoformat(v.replace("Z", "+00:00"))
        if isinstance(v, datetime):
            return to_utc(v)
        return v

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

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v: Any) -> Optional[datetime]:
        if v is None:
            return v
        if isinstance(v, str):
            v = datetime.fromisoformat(v.replace("Z", "+00:00"))
        if isinstance(v, datetime):
            return to_utc(v)
        return v

class ShoppingListOut(ShoppingListBase):
    id: int
    user_id: int
    status: ListStatus
    is_auto_generated: bool
    items: List[ShoppingListItemOut] = []
    
    model_config = ConfigDict(from_attributes=True)
