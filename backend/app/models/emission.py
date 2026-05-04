from pydantic import BaseModel, Field
from datetime import datetime

class EmissionInput(BaseModel):
    transport_km: float = Field(..., ge=0)
    electricity_kwh: float = Field(..., ge=0)
    lpg_kg: float = Field(..., ge=0)
    flight_km: float = Field(0, ge=0)

class EmissionInDB(BaseModel):
    user_id: str

    transport_km: float
    electricity_kwh: float
    lpg_kg: float
    flight_km: float

    transport_emission: float
    electricity_emission: float
    lpg_emission: float
    flight_emission: float

    total_emission: float

    month: str
    created_at: datetime = datetime.utcnow()