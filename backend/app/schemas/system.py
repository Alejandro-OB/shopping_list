from datetime import datetime
from pydantic import BaseModel

class Heartbeat(BaseModel):
    id: int
    value: int
    timestamp: datetime

    class Config:
        from_attributes = True

class HealthCheck(BaseModel):
    status: str
    database: str
    version: str
