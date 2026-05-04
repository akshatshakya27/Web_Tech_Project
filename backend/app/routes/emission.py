from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from datetime import datetime
from app.config.db import emissions_collection
from app.middleware.dependencies import get_current_user
from app.models.emission import EmissionInput
from app.utils.calculation import calculate_emissions
from app.utils.suggestion import generate_suggestions

router = APIRouter(prefix="/api/emission", tags=["Emission"])


def format_emission_for_response(doc):
    """
    Transform stored emission document into frontend-friendly format.
    Converts backend field names to frontend expected structure.
    """
    return {
        "_id": doc.get("_id"),
        "month": doc.get("month"),
        "total": doc.get("total_emission", 0),
        "total_emission": doc.get("total_emission", 0),
        "transport": doc.get("transport_emission", 0),
        "electricity": doc.get("electricity_emission", 0),
        "lpg": doc.get("lpg_emission", 0),
        "flight": doc.get("flight_emission", 0),
        "calculated_emissions": {
            "transport": doc.get("transport_emission", 0),
            "electricity": doc.get("electricity_emission", 0),
            "lpg": doc.get("lpg_emission", 0),
            "flight": doc.get("flight_emission", 0),
        },
        "suggestions": doc.get("suggestions", [])
    }


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
            "emission": format_emission_for_response(emission_data),
            "suggestions": suggestions
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Error saving emission data: {str(e)}"}
        )


# 📊 GET LATEST
@router.get("/latest")
def get_latest(current_user=Depends(get_current_user)):

    data = emissions_collection.find_one(
        {"user_id": str(current_user["_id"])},
        sort=[("created_at", -1)]
    )

    if not data:
        return JSONResponse(status_code=404, content={"message": "No emissions recorded yet"})

    data["_id"] = str(data["_id"])
    formatted = format_emission_for_response(data)
    
    return {
        "emission": formatted,
        "suggestions": formatted.get("suggestions", [])
    }


# 📈 GET HISTORY
@router.get("/history")
def get_history(current_user=Depends(get_current_user), limit: int = Query(100, ge=1, le=1000)):

    records = list(
        emissions_collection.find(
            {"user_id": str(current_user["_id"])}
        ).sort("created_at", -1).limit(limit)
    )

    formatted_records = []
    for r in records:
        r["_id"] = str(r["_id"])
        formatted_records.append(format_emission_for_response(r))

    # Reverse to get chronological order (oldest first)
    formatted_records.reverse()

    return {
        "emissions": formatted_records,
        "count": len(formatted_records)
    }