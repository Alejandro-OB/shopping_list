from pydantic import BaseModel, ConfigDict
from datetime import datetime


class HeartbeatOut(BaseModel):
    id: int
    value: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
