const getEmissionShare = (value, total) => {
  if (!total || total <= 0) {
    return 0;
  }

  return value / total;
};

const buildSuggestion = (category, message, priority = "medium") => ({
  category,
  message,
  priority,
});

const generateSuggestions = ({ calculated_emissions, total_emission }) => {
  const suggestions = [];

  const transportShare = getEmissionShare(
    calculated_emissions.transport,
    total_emission
  );
  const electricityShare = getEmissionShare(
    calculated_emissions.electricity,
    total_emission
  );
  const lpgShare = getEmissionShare(calculated_emissions.lpg, total_emission);
  const flightShare = getEmissionShare(
    calculated_emissions.flight,
    total_emission
  );

  if (total_emission === 0) {
    suggestions.push(
      buildSuggestion(
        "general",
        "Great job. Your reported emissions are currently zero. Keep tracking regularly to maintain this baseline.",
        "low"
      )
    );
    return suggestions;
  }

  if (transportShare >= 0.35 || calculated_emissions.transport >= 25) {
    suggestions.push(
      buildSuggestion(
        "transport",
        "Transport is a major contributor. Consider carpooling, public transport, cycling, or batching trips to reduce travel emissions.",
        "high"
      )
    );
  }

  if (electricityShare >= 0.35 || calculated_emissions.electricity >= 50) {
    suggestions.push(
      buildSuggestion(
        "electricity",
        "Electricity usage is significant. Switching to LED lighting, unplugging idle devices, and using energy-efficient appliances can lower consumption.",
        "high"
      )
    );
  }

  if (lpgShare >= 0.25 || calculated_emissions.lpg >= 20) {
    suggestions.push(
      buildSuggestion(
        "lpg",
        "LPG emissions are noticeable. Try using pressure cookers, optimizing cooking time, or adopting induction cooking where possible.",
        "medium"
      )
    );
  }

  if (flightShare >= 0.25 || calculated_emissions.flight >= 100) {
    suggestions.push(
      buildSuggestion(
        "flight",
        "Flights create a large footprint. Choose trains for short trips, reduce non-essential travel, or combine multiple trips into one journey.",
        "high"
      )
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      buildSuggestion(
        "general",
        "Your emissions are balanced across categories. Focus on small improvements in daily routines to steadily reduce your total footprint.",
        "low"
      )
    );
  }

  return suggestions;
};

module.exports = {
  generateSuggestions,
};