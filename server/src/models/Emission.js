const mongoose = require("mongoose");

const emissionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user_id is required"],
      index: true,
    },
    transport_km: {
      type: Number,
      required: [true, "transport_km is required"],
      min: [0, "transport_km cannot be negative"],
    },
    electricity_kwh: {
      type: Number,
      required: [true, "electricity_kwh is required"],
      min: [0, "electricity_kwh cannot be negative"],
    },
    lpg_kg: {
      type: Number,
      required: [true, "lpg_kg is required"],
      min: [0, "lpg_kg cannot be negative"],
    },
    flight_km: {
      type: Number,
      required: [true, "flight_km is required"],
      min: [0, "flight_km cannot be negative"],
    },
    calculated_emissions: {
      transport: {
        type: Number,
        required: [true, "calculated_emissions.transport is required"],
        min: [0, "calculated transport emission cannot be negative"],
      },
      electricity: {
        type: Number,
        required: [true, "calculated_emissions.electricity is required"],
        min: [0, "calculated electricity emission cannot be negative"],
      },
      lpg: {
        type: Number,
        required: [true, "calculated_emissions.lpg is required"],
        min: [0, "calculated LPG emission cannot be negative"],
      },
      flight: {
        type: Number,
        required: [true, "calculated_emissions.flight is required"],
        min: [0, "calculated flight emission cannot be negative"],
      },
    },
    total_emission: {
      type: Number,
      required: [true, "total_emission is required"],
      min: [0, "total_emission cannot be negative"],
    },
    month: {
      type: String,
      required: [true, "month is required"],
      trim: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format"],
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

emissionSchema.index({ user_id: 1, month: -1, created_at: -1 });

module.exports = mongoose.model("Emission", emissionSchema);
