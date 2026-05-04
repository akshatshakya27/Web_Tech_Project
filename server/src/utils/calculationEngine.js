const EMISSION_FACTORS = require("../config/emissionFactors");

/**
 * Calculate emissions for a single activity category
 * @param {number} amount - Activity amount (km, kWh, kg, etc.)
 * @param {string} category - Activity type (transport, electricity, lpg, flight)
 * @returns {number} Calculated emission in kg CO2e
 */
const calculateCategoryEmission = (amount, category) => {
  const factor = EMISSION_FACTORS[`${category.toUpperCase()}_${category === "electricity" ? "KWH" : category === "lpg" ? "KG" : "KM"}`];

  if (factor === undefined) {
    throw new Error(`Unknown emission category: ${category}`);
  }

  if (typeof amount !== "number" || amount < 0) {
    throw new Error(`Invalid amount for ${category}: must be a non-negative number`);
  }

  const emission = amount * factor;

  // Round to 2 decimal places to avoid floating-point precision issues
  return Math.round(emission * 100) / 100;
};

/**
 * Calculate all emissions from user activity inputs
 * @param {object} input - User activity data
 *   - input.transport_km
 *   - input.electricity_kwh
 *   - input.lpg_kg
 *   - input.flight_km
 * @returns {object} Calculated emissions breakdown + total
 *   - calculated_emissions: { transport, electricity, lpg, flight }
 *   - total_emission: sum of all categories
 */
const calculateEmissions = (input) => {
  // Validate all required fields are present
  const requiredFields = ["transport_km", "electricity_kwh", "lpg_kg", "flight_km"];
  for (const field of requiredFields) {
    if (input[field] === undefined || input[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Calculate each category
  const calculated_emissions = {
    transport: calculateCategoryEmission(input.transport_km, "transport"),
    electricity: calculateCategoryEmission(input.electricity_kwh, "electricity"),
    lpg: calculateCategoryEmission(input.lpg_kg, "lpg"),
    flight: calculateCategoryEmission(input.flight_km, "flight"),
  };

  // Calculate total
  const total_emission =
    calculated_emissions.transport +
    calculated_emissions.electricity +
    calculated_emissions.lpg +
    calculated_emissions.flight;

  // Round total to 2 decimal places
  const total_emission_rounded = Math.round(total_emission * 100) / 100;

  return {
    calculated_emissions,
    total_emission: total_emission_rounded,
  };
};

module.exports = {
  calculateEmissions,
  calculateCategoryEmission,
};
