from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from app.config.db import emissions_collection
from app.middleware.dependencies import get_current_user
from app.models.emission import EmissionInput
from app.utils.calculation import calculate_emissions
from app.utils.suggestion import generate_suggestions

router = APIRouter(prefix="/api/emission", tags=["Emission"])


# ➕ ADD EMISSION
@router.post("/add")
def add_emission(data: EmissionInput, current_user=Depends(get_current_user)):

    try:
        # Step 1: Calculate emissions
        calculated = calculate_emissions(data.model_dump())

        # Step 2: Intelligent + heuristic suggestions
        suggestions = generate_suggestions(calculated)

        emission_data = {
            "user_id": str(current_user["_id"]),

            "transport_km": data.transport_km,
            "electricity_kwh": data.electricity_kwh,
            "lpg_kg": data.lpg_kg,
            "flight_km": data.flight_km,

            **calculated,

            # ✅ ONLY HEURISTIC OUTPUT NOW
            "suggestions": suggestions,

            "month": datetime.utcnow().strftime("%Y-%m"),
            "created_at": datetime.utcnow()
        }

        result = emissions_collection.insert_one(emission_data)
        emission_data["_id"] = str(result.inserted_id)

        return {
            "message": "Emission data saved",
            "emission": emission_data,
            "suggestions": suggestions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 📊 GET LATEST
@router.get("/latest")
def get_latest(current_user=Depends(get_current_user)):

    data = emissions_collection.find_one(
        {"user_id": str(current_user["_id"])},
        sort=[("created_at", -1)]
    )

    if not data:
        return {"message": "No data found"}

    data["_id"] = str(data["_id"])
    return data


# 📈 GET HISTORY
@router.get("/history")
def get_history(current_user=Depends(get_current_user)):

    records = list(
        emissions_collection.find({"user_id": str(current_user["_id"])})
    )

    for r in records:
        r["_id"] = str(r["_id"])

    return records