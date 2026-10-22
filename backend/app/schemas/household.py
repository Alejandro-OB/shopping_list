from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class HouseholdPerson(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class HouseholdOut(BaseModel):
    # owner: el hogar es suyo (tenga o no miembros). member: usa el de otro.
    role: Literal["owner", "member"]
    owner: HouseholdPerson
    members: List[HouseholdPerson] = []
    # Solo se le muestra al dueño.
    invite_code: Optional[str] = None
    invite_expires_at: Optional[datetime] = None


class HouseholdJoinIn(BaseModel):
    code: str = Field(..., min_length=4, max_length=32)
