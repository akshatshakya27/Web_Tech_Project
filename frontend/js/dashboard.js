/*
 * EcoTrack Dashboard Logic
 * - Fetches latest and historical emission data from user account only
 * - Renders summary cards, pie/line charts, suggestions, and CSV export.
 */

(function dashboardModule() {
  const USER_PROFILE_KEY = "ecotrack_user";

  const token = EcoAPI.getToken();
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const userNameEl = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  const emissionForm = document.getElementById("emissionForm");
  const formMessage = document.getElementById("formMessage");
  const suggestionsPanel = document.getElementById("suggestionsPanel");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  const emissionMonthInput = document.getElementById("emissionMonth");

  let pieChartInstance = null;
  let lineChartInstance = null;
  let cachedHistory = [];

  const summaryEls = {
    total: document.getElementById("totalEmission"),
    transport: document.getElementById("transportEmission"),
    electricity: document.getElementById("electricityEmission"),
    lpg: document.getElementById("lpgEmission"),
    flight: document.getElementById("flightEmission")
  };

  /** Extracts display name from token payload. */
  function setUserName() {
    const storedUser = getStoredUser();
    const payload = EcoAPI.parseJwtPayload(token) || {};
    const name = storedUser?.name || payload.name || payload.username || payload.user?.name || "User";
    userNameEl.textContent = name;
  }

  /** Reads persisted user profile saved at login time. */
  function getStoredUser() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  /** Returns current month in YYYY-MM format for the form default. */
  function getCurrentMonthValue() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  }

  /** Formats YYYY-MM values into a readable label for chart axes. */
  function formatMonthLabel(monthValue) {
    if (!monthValue) {
      return "Unknown month";
    }

    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(monthValue)) {
      const [year, month] = monthValue.split("-").map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleString("en-US", { month: "short", year: "numeric" });
    }

    return monthValue;
  }

  /** Normalizes backend emission payload into a consistent UI shape. */
  function normalizeEmissionRecord(record = {}) {
    const calculated = record.calculated_emissions || {};
    const transport = Number(calculated.transport ?? record.transport ?? 0);
    const electricity = Number(calculated.electricity ?? record.electricity ?? 0);
    const lpg = Number(calculated.lpg ?? record.lpg ?? 0);
    const flight = Number(calculated.flight ?? record.flight ?? 0);
    const total = Number(record.total_emission ?? record.total ?? transport + electricity + lpg + flight);

    return {
      month: record.month || record.label || getCurrentMonthValue(),
      transport: Number.isFinite(transport) ? transport : 0,
      electricity: Number.isFinite(electricity) ? electricity : 0,
      lpg: Number.isFinite(lpg) ? lpg : 0,
      flight: Number.isFinite(flight) ? flight : 0,
      total: Number.isFinite(total) ? total : 0,
    };
  }

  /** Builds rule-based suggestions from the latest emission profile. */
  function buildSuggestionsFromEmission(values) {
    const suggestions = [];
    const total = values.total || 0;

    const transportShare = total > 0 ? values.transport / total : 0;
    const electricityShare = total > 0 ? values.electricity / total : 0;
    const lpgShare = total > 0 ? values.lpg / total : 0;
    const flightShare = total > 0 ? values.flight / total : 0;

    if (total === 0) {
      suggestions.push({
        category: "general",
        priority: "low",
        message: "No emissions recorded yet. Submit your first month to see personalized sustainability tips.",
      });
      return suggestions;
    }

    if (transportShare >= 0.35 || values.transport >= 25) {
      suggestions.push({
        category: "transport",
        priority: "high",
        message: "Transport is a major contributor. Try carpooling, public transport, cycling, or combining errands into fewer trips.",
      });
    }

    if (electricityShare >= 0.35 || values.electricity >= 50) {
      suggestions.push({
        category: "electricity",
        priority: "high",
        message: "Electricity usage is significant. LED lighting, efficient appliances, and switching off idle devices can reduce impact.",
      });
    }

    if (lpgShare >= 0.25 || values.lpg >= 20) {
      suggestions.push({
        category: "lpg",
        priority: "medium",
        message: "LPG emissions are notable. Consider pressure cooking, shorter cooking times, or induction alternatives where possible.",
      });
    }

    if (flightShare >= 0.25 || values.flight >= 100) {
      suggestions.push({
        category: "flight",
        priority: "high",
        message: "Flights create a large footprint. Choose rail for short trips, reduce non-essential travel, or bundle trips into one journey.",
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        category: "general",
        priority: "low",
        message: "Your footprint looks balanced. Keep tracking monthly and look for small wins across daily habits.",
      });
    }

    return suggestions;
  }

  /** Formats number as rounded kg text. */
  function asKg(value) {
    const num = Number(value || 0);
    return `${num.toFixed(2)} kg`;
  }

  /** Ensures provided value is valid non-negative number. */
  function toNonNegativeNumber(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
  }

  function updateEcoBadge(total) {
    const badgeContainer = document.getElementById("ecoBadgeContainer");
    if (!badgeContainer) return;

    if (total === 0 && document.getElementById("totalEmission").textContent === "0.00 kg") {
      badgeContainer.classList.add("hidden");
      return;
    }

    badgeContainer.classList.remove("hidden", "excellent", "good", "average", "poor");
    
    let badgeClass = "";
    let badgeText = "";
    let badgeIcon = "";

    if (total <= 100) {
      badgeClass = "excellent";
      badgeText = "Optimal Efficiency";
      badgeIcon = "<i class='ph ph-check-circle'></i>";
    } else if (total <= 250) {
      badgeClass = "good";
      badgeText = "Standard Range";
      badgeIcon = "<i class='ph ph-info'></i>";
    } else if (total <= 500) {
      badgeClass = "average";
      badgeText = "Elevated Usage";
      badgeIcon = "<i class='ph ph-warning'></i>";
    } else {
      badgeClass = "poor";
      badgeText = "High Footprint";
      badgeIcon = "<i class='ph ph-warning-octagon'></i>";
    }

    badgeContainer.classList.add(badgeClass);
    badgeContainer.innerHTML = `${badgeIcon} <span>${badgeText}</span>`;
  }

  /** Updates summary cards and dependent UI sections from latest values. */
  function applyLatestToUI(latest, suggestions = []) {
    const normalized = normalizeEmissionRecord(latest || {});

    summaryEls.total.textContent = asKg(normalized.total);
    summaryEls.transport.textContent = asKg(normalized.transport);
    summaryEls.electricity.textContent = asKg(normalized.electricity);
    summaryEls.lpg.textContent = asKg(normalized.lpg);
    summaryEls.flight.textContent = asKg(normalized.flight);

    updateEcoBadge(normalized.total);
    renderPieChart(normalized);
    renderSuggestions(suggestions.length ? suggestions : buildSuggestionsFromEmission(normalized));
  }

  /** Reads latest emission and updates cards, pie chart, and suggestions. */
  async function fetchLatestEmission() {
    try {
      const response = await EcoAPI.authorizedFetch("/api/emission/latest");
      
      if (response.status === 404) {
        // No emission data recorded yet - show empty state
        applyLatestToUI({ transport: 0, electricity: 0, lpg: 0, flight: 0, total: 0 }, []);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch latest emission.");
      }

      const payload = await response.json();
      applyLatestToUI(payload.emission || {}, payload.suggestions || []);
    } catch (error) {
      console.error("Error fetching latest emission:", error);
      EcoAPI.showToast("Error loading emission data. Please refresh.", "error");
      applyLatestToUI({ transport: 0, electricity: 0, lpg: 0, flight: 0, total: 0 }, []);
    }
  }

  /** Reads historical emission list and updates line chart data source. */
  async function fetchHistory() {
    try {
      const response = await EcoAPI.authorizedFetch("/api/emission/history?limit=100");
      
      if (!response.ok) {
        throw new Error("Failed to fetch emission history.");
      }

      const payload = await response.json();
      cachedHistory = Array.isArray(payload.emissions) && payload.emissions.length ? payload.emissions : [];
      renderLineChart(cachedHistory);
    } catch (error) {
      console.error("Error fetching history:", error);
      EcoAPI.showToast("Error loading emission history.", "error");
      cachedHistory = [];
      renderLineChart([]);
    }
  }

  /** Renders or re-renders pie chart for latest emission categories. */
  function renderPieChart(values) {
    const ctx = document.getElementById("emissionPieChart");
    if (!ctx) return;

    if (pieChartInstance) {
      pieChartInstance.destroy();
    }

    pieChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Transport", "Electricity", "LPG", "Flights"],
        datasets: [
          {
            data: [values.transport, values.electricity, values.lpg, values.flight],
            backgroundColor: ["#047857", "#059669", "#10b981", "#34d399"],
            borderWidth: 0,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            padding: 12,
            titleFont: { family: "'Inter', sans-serif" },
            bodyFont: { family: "'Inter', sans-serif" },
            cornerRadius: 6
          }
        }
      }
    });
  }

  /** Renders or re-renders line chart from monthly historical totals. */
  function renderLineChart(history) {
    const ctx = document.getElementById("emissionLineChart");
    if (!ctx) return;

    if (lineChartInstance) {
      lineChartInstance.destroy();
    }

    const labels = history.map((item, index) => formatMonthLabel(item.month || item.label || `Month ${index + 1}`));
    const totals = history.map((item) => Number(item.total_emission ?? item.total ?? 0));

    // Calculate dynamic gradient
    const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(4, 120, 87, 0.15)");
    gradient.addColorStop(1, "rgba(4, 120, 87, 0.0)");

    lineChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Total CO₂ (kg)",
            data: totals,
            borderColor: "#047857",
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#047857",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            padding: 12,
            titleFont: { family: "'Inter', sans-serif" },
            bodyFont: { family: "'Inter', sans-serif" },
            cornerRadius: 6,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0, 0, 0, 0.05)", drawBorder: false },
            ticks: { font: { family: "'Inter', sans-serif" } }
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { font: { family: "'Inter', sans-serif" } }
          }
        }
      }
    });
  }

  function renderSuggestions(suggestions) {
    const cards = Array.isArray(suggestions) && suggestions.length ? suggestions : buildSuggestionsFromEmission({ total: 0, transport: 0, electricity: 0, lpg: 0, flight: 0 });

    suggestionsPanel.innerHTML = "";
    cards.forEach((tip) => {
      const card = document.createElement("article");
      const priorityClass = `priority-${String(tip.priority || "low").toLowerCase()}`;
      card.className = `suggestion-card ${priorityClass}`;
      card.innerHTML = `<h4>${tip.category.toUpperCase()} · <span class="priority-label ${priorityClass}">${tip.priority}</span></h4><p>${tip.message}</p>`;
      suggestionsPanel.appendChild(card);
    });
  }

  /** Handles emission form submit with validation and refresh cycle. */
  async function handleEmissionSubmit(event) {
    event.preventDefault();
    formMessage.textContent = "";

    const vehicleDistance = toNonNegativeNumber(document.getElementById("vehicleDistance").value);
    const electricityUsage = toNonNegativeNumber(document.getElementById("electricityUsage").value);
    const lpgUsage = toNonNegativeNumber(document.getElementById("lpgUsage").value);
    const flightDistance = toNonNegativeNumber(document.getElementById("flightDistance").value);
    const month = emissionMonthInput?.value || getCurrentMonthValue();

    if ([vehicleDistance, electricityUsage, lpgUsage, flightDistance].some((value) => value === null)) {
      EcoAPI.showToast("All values must be non-negative numbers.", "error");
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      EcoAPI.showToast("Please select a valid month.", "error");
      return;
    }

    EcoAPI.setLoading(true);

    try {
      const response = await EcoAPI.authorizedFetch("/api/emission/add", {
        method: "POST",
        body: JSON.stringify({
          transport_km: vehicleDistance,
          electricity_kwh: electricityUsage,
          lpg_kg: lpgUsage,
          flight_km: flightDistance,
          month
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        EcoAPI.showToast(result.message || "Unable to save emission data.", "error");
        return;
      }

      formMessage.textContent = "Saved successfully.";
      EcoAPI.showToast("Emission data saved.", "success");
      emissionForm.reset();
      if (emissionMonthInput) {
        emissionMonthInput.value = getCurrentMonthValue();
      }

      applyLatestToUI(result.emission || {}, result.suggestions || []);

      await Promise.all([fetchLatestEmission(), fetchHistory()]);
    } catch (error) {
      EcoAPI.showToast("Unable to connect. Please try again.", "error");
    } finally {
      EcoAPI.setLoading(false);
    }
  }

  /** Downloads cached history as CSV file. */
  function downloadCsv() {
    if (!cachedHistory.length) {
      EcoAPI.showToast("No history available for export.", "error");
      return;
    }

    const header = ["month", "total_emission", "transport", "electricity", "lpg", "flight"];
    const rows = cachedHistory.map((item, index) => {
      const normalized = normalizeEmissionRecord(item);
      return [
        normalized.month || `Month ${index + 1}`,
        normalized.total,
        normalized.transport,
        normalized.electricity,
        normalized.lpg,
        normalized.flight
      ];
    });

    const csvContent = [header, ...rows]
      .map((columns) => columns.map((column) => `"${String(column).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const fileUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = fileUrl;
    anchor.download = "ecotrack-emission-history.csv";
    anchor.click();

    URL.revokeObjectURL(fileUrl);
    EcoAPI.showToast("CSV downloaded.", "success");
  }

  /** Initializes page interactions and first-load data flow. */
  async function initializeDashboard() {
    setUserName();
    if (emissionMonthInput) {
      emissionMonthInput.value = getCurrentMonthValue();
    }

    logoutBtn.addEventListener("click", () => {
      EcoAPI.removeToken();
      localStorage.removeItem(USER_PROFILE_KEY);
      window.location.href = "index.html";
    });

    emissionForm.addEventListener("submit", handleEmissionSubmit);
    downloadCsvBtn.addEventListener("click", downloadCsv);

    EcoAPI.setLoading(true);
    try {
      await Promise.all([fetchLatestEmission(), fetchHistory()]);
    } catch (error) {
      console.error("Error initializing dashboard:", error);
      EcoAPI.showToast("Error loading dashboard data.", "error");
    } finally {
      EcoAPI.setLoading(false);
    }
  }

  initializeDashboard();
})();
