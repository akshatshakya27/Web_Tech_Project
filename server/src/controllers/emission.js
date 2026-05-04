const Emission = require("../models/Emission");
const { calculateEmissions } = require("../utils/calculationEngine");
const { generateSuggestions } = require("../utils/suggestionEngine");

/**
 * POST /api/emission/add
 * Accept user activity input, validate, calculate emissions, store in database
 */
const addEmission = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transport_km, electricity_kwh, lpg_kg, flight_km, month } =
      req.body;

    // Validate all required fields are present
    if (
      transport_km === undefined ||
      electricity_kwh === undefined ||
      lpg_kg === undefined ||
      flight_km === undefined ||
      !month
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields (transport_km, electricity_kwh, lpg_kg, flight_km, month) are required",
      });
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month must be in YYYY-MM format (e.g., 2026-05)",
      });
    }

    // Validate all values are numbers and non-negative
    const values = { transport_km, electricity_kwh, lpg_kg, flight_km };
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== "number" || value < 0) {
        return res.status(400).json({
          success: false,
          message: `${key} must be a non-negative number`,
        });
      }
    }

    // Calculate emissions using calculation engine
    const { calculated_emissions, total_emission } = calculateEmissions({
      transport_km,
      electricity_kwh,
      lpg_kg,
      flight_km,
    });

    // Generate rule-based sustainability suggestions from the calculated profile
    const suggestions = generateSuggestions({
      calculated_emissions,
      total_emission,
    });

    // Create new Emission document
    const emission = new Emission({
      user_id: userId,
      transport_km,
      electricity_kwh,
      lpg_kg,
      flight_km,
      calculated_emissions,
      total_emission,
      month,
    });

    // Save to database
    await emission.save();

    res.status(201).json({
      success: true,
      message: "Emission data recorded successfully",
      suggestions,
      emission: {
        id: emission._id,
        user_id: emission.user_id,
        transport_km: emission.transport_km,
        electricity_kwh: emission.electricity_kwh,
        lpg_kg: emission.lpg_kg,
        flight_km: emission.flight_km,
        calculated_emissions: emission.calculated_emissions,
        total_emission: emission.total_emission,
        month: emission.month,
        created_at: emission.created_at,
      },
    });
  } catch (error) {
    console.error("Add emission error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while recording emission data",
    });
  }
};

/**
 * GET /api/emission/latest
 * Fetch most recent emission record for authenticated user
 */
const getLatestEmission = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find most recent emission for this user
    const emission = await Emission.findOne({ user_id: userId }).sort({
      created_at: -1,
    });

    if (!emission) {
      return res.status(404).json({
        success: true,
        message: "No emission data found",
        emission: null,
      });
    }

    res.status(200).json({
      success: true,
      message: "Latest emission data retrieved",
      emission: {
        id: emission._id,
        user_id: emission.user_id,
        transport_km: emission.transport_km,
        electricity_kwh: emission.electricity_kwh,
        lpg_kg: emission.lpg_kg,
        flight_km: emission.flight_km,
        calculated_emissions: emission.calculated_emissions,
        total_emission: emission.total_emission,
        month: emission.month,
        created_at: emission.created_at,
      },
    });
  } catch (error) {
    console.error("Get latest emission error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving emission data",
    });
  }
};

/**
 * GET /api/emission/history
 * Fetch all emission records for authenticated user (supports pagination)
 */
const getEmissionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination: page must be >= 1, limit must be 1-100",
      });
    }

    const skip = (page - 1) * limit;

    // Query all emissions for this user with pagination
    const emissions = await Emission.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const total = await Emission.countDocuments({ user_id: userId });

    res.status(200).json({
      success: true,
      message: "Emission history retrieved",
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      emissions: emissions.map((emission) => ({
        id: emission._id,
        user_id: emission.user_id,
        transport_km: emission.transport_km,
        electricity_kwh: emission.electricity_kwh,
        lpg_kg: emission.lpg_kg,
        flight_km: emission.flight_km,
        calculated_emissions: emission.calculated_emissions,
        total_emission: emission.total_emission,
        month: emission.month,
        created_at: emission.created_at,
      })),
    });
  } catch (error) {
    console.error("Get emission history error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving emission history",
    });
  }
};

module.exports = {
  addEmission,
  getLatestEmission,
  getEmissionHistory,
};
