def generate_suggestions(emission_data):
    total = emission_data["total_emission"]

    if total == 0:
        return {
            "top_contributor": None,
            "percentage": 0,
            "breakdown": {},
            "suggestions": []
        }

    contributions = {
        "transport": (emission_data["transport_emission"] / total) * 100,
        "electricity": (emission_data["electricity_emission"] / total) * 100,
        "lpg": (emission_data["lpg_emission"] / total) * 100,
        "flight": (emission_data["flight_emission"] / total) * 100,
    }

    sorted_categories = sorted(
        contributions.items(),
        key=lambda x: x[1],
        reverse=True
    )

    top_category, top_percent = sorted_categories[0]

    suggestions = []

    if top_category == "electricity":
        suggestions = [
            "Switch to LED lighting",
            "Use energy-efficient appliances",
            "Turn off standby devices"
        ]

    elif top_category == "transport":
        suggestions = [
            "Use public transport",
            "Try carpooling",
            "Walk or cycle for short trips"
        ]

    elif top_category == "lpg":
        suggestions = [
            "Use induction cooking",
            "Optimize cooking usage",
            "Reduce gas wastage"
        ]

    elif top_category == "flight":
        suggestions = [
            "Limit air travel",
            "Choose direct flights",
            "Use carbon offset programs"
        ]

    return {
        "top_contributor": top_category,
        "percentage": round(top_percent, 2),
        "breakdown": {
            k: round(v, 2) for k, v in contributions.items()
        },
        "suggestions": suggestions
    }