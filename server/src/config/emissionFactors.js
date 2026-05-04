/**
 * Emission Factors (kg CO2-equivalent per unit)
 * These are standardized values based on typical regional averages.
 * Source: EPA, IPCC, and typical carbon footprint calculators
 *
 * All values represent kilograms of CO2-equivalent emissions per unit activity.
 */

const EMISSION_FACTORS = {
  // Transport: CO2 per km driven (average car with 1 passenger)
  // Typical car emissions: 0.2-0.25 kg CO2/km
  TRANSPORT_KM: 0.21,

  // Electricity: CO2 per kWh consumed
  // Varies by region (coal-heavy regions: 0.8-1.0, renewable-heavy: 0.1-0.3)
  // Using global average: 0.4-0.5 kg CO2/kWh
  ELECTRICITY_KWH: 0.45,

  // LPG (Liquefied Petroleum Gas): CO2 per kg burned
  // Typical: 3.0-3.2 kg CO2/kg LPG
  LPG_KG: 3.08,

  // Flight: CO2 per km flown (average economy, including radiative forcing multiplier)
  // Direct emissions: 0.09 kg CO2/km
  // With RFI multiplier (non-CO2 effects at altitude): ~0.25 kg CO2e/km
  FLIGHT_KM: 0.25,
};

module.exports = EMISSION_FACTORS;
