def calculate_emissions(data):
    transport = data["transport_km"] * 0.21
    electricity = data["electricity_kwh"] * 0.82
    lpg = data["lpg_kg"] * 2.98
    flight = data.get("flight_km", 0) * 0.115

    total = transport + electricity + lpg + flight

    return {
        "transport_emission": transport,
        "electricity_emission": electricity,
        "lpg_emission": lpg,
        "flight_emission": flight,
        "total_emission": total
    }