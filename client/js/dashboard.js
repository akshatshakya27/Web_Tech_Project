/*
 * EcoTrack Dashboard Logic
 * - Fetches latest and historical emission data.
 * - Renders summary cards, pie/line charts, suggestions, and CSV export.
 */

(function dashboardModule() {
  const DEMO_HISTORY_KEY = "ecotrack_demo_emission_history";

  const token = EcoAPI.getToken();
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  EcoAPI.applySavedTheme();

  const userNameEl = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const emissionForm = document.getElementById("emissionForm");
  const formMessage = document.getElementById("formMessage");
  const suggestionsPanel = document.getElementById("suggestionsPanel");
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");

  let pieChartInstance = null;
  let lineChartInstance = null;
  let cachedHistory = [];
  let isDemoMode = false;

  const summaryEls = {
    total: document.getElementById("totalEmission"),
    transport: document.getElementById("transportEmission"),
    electricity: document.getElementById("electricityEmission"),
    lpg: document.getElementById("lpgEmission"),
    flight: document.getElementById("flightEmission")
  };

  /** Extracts display name from token payload. */
  function setUserName() {
    const payload = EcoAPI.parseJwtPayload(token) || {};
    const name = payload.name || payload.username || payload.user?.name || "User";
    userNameEl.textContent = name;
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

  /** Determines if HTTP status should trigger demo fallback mode. */
  function isBackendUnavailableStatus(status) {
    return [404, 405, 500, 502, 503].includes(status);
  }

  /** Enables demo mode once and informs user. */
  function enableDemoMode() {
    if (!isDemoMode) {
      isDemoMode = true;
      EcoAPI.showToast("Demo mode enabled with sample dashboard data.", "success");
    }
  }

  /** Returns month labels for the last N months including current month. */
  function getLastMonthLabels(count) {
    const labels = [];
    const now = new Date();

    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      labels.push(date.toLocaleString("en-US", { month: "short", year: "numeric" }));
    }

    return labels;
  }

  /** Builds default seeded history so charts/cards look complete in demo mode. */
  function createSeedDemoHistory() {
    const labels = getLastMonthLabels(6);
    const baseData = [
      { transport: 120, electricity: 165, lpg: 28, flight: 40 },
      { transport: 135, electricity: 172, lpg: 30, flight: 20 },
      { transport: 150, electricity: 185, lpg: 32, flight: 60 },
      { transport: 142, electricity: 190, lpg: 31, flight: 35 },
      { transport: 160, electricity: 210, lpg: 36, flight: 80 },
      { transport: 148, electricity: 198, lpg: 33, flight: 45 }
    ];

    return labels.map((month, index) => {
      const item = baseData[index];
      const total = item.transport + item.electricity + item.lpg + item.flight;
      return { month, ...item, total };
    });
  }

  /** Reads demo history from localStorage and seeds if missing. */
  function getDemoHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DEMO_HISTORY_KEY) || "[]");
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch (error) {
      // Ignore parse error and regenerate seed data.
    }

    const seed = createSeedDemoHistory();
    localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(seed));
    return seed;
  }

  /** Persists demo history to localStorage. */
  function saveDemoHistory(history) {
    localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(history));
  }

  /** Updates summary cards and dependent UI sections from latest values. */
  function applyLatestToUI(latest) {
    const transport = Number(latest.transport ?? latest.vehicle ?? latest.transportEmission ?? 0);
    const electricity = Number(latest.electricity ?? latest.electricityEmission ?? 0);
    const lpg = Number(latest.lpg ?? latest.lpgEmission ?? 0);
    const flight = Number(latest.flight ?? latest.flights ?? latest.flightEmission ?? 0);
    const total = Number(latest.total ?? transport + electricity + lpg + flight);

    summaryEls.total.textContent = asKg(total);
    summaryEls.transport.textContent = asKg(transport);
    summaryEls.electricity.textContent = asKg(electricity);
    summaryEls.lpg.textContent = asKg(lpg);
    summaryEls.flight.textContent = asKg(flight);

    renderPieChart({ transport, electricity, lpg, flight });
    generateSuggestions({ transport, electricity, lpg, flight });
  }

  /** Converts form distance/usage values into emission categories (kg CO2). */
  function calculateEmissionsFromInputs({ vehicleDistance, electricityUsage, lpgUsage, flightDistance }) {
    const transport = Number((vehicleDistance * 0.21).toFixed(2));
    const electricity = Number((electricityUsage * 0.82).toFixed(2));
    const lpg = Number((lpgUsage * 2.98).toFixed(2));
    const flight = Number((flightDistance * 0.15).toFixed(2));
    const total = Number((transport + electricity + lpg + flight).toFixed(2));

    return { transport, electricity, lpg, flight, total };
  }

  /** Appends a new demo history entry for the current month label. */
  function addDemoHistoryEntry(entry) {
    const history = getDemoHistory();
    const currentMonth = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
    history.push({ month: currentMonth, ...entry });
    saveDemoHistory(history);
    return history;
  }

  /** Reads latest emission and updates cards, pie chart, and suggestions. */
  async function fetchLatestEmission() {
    try {
      const response = await EcoAPI.authorizedFetch("/api/emission/latest");
      if (!response.ok) {
        if (isBackendUnavailableStatus(response.status)) {
          enableDemoMode();
          const demoLatest = getDemoHistory().slice(-1)[0] || { transport: 0, electricity: 0, lpg: 0, flight: 0, total: 0 };
          applyLatestToUI(demoLatest);
          return;
        }
        throw new Error("Failed to fetch latest emission.");
      }

      const latest = await response.json();
      applyLatestToUI(latest);
    } catch (error) {
      enableDemoMode();
      const demoLatest = getDemoHistory().slice(-1)[0] || { transport: 0, electricity: 0, lpg: 0, flight: 0, total: 0 };
      applyLatestToUI(demoLatest);
    }
  }

  /** Reads historical emission list and updates line chart data source. */
  async function fetchHistory() {
    try {
      const response = await EcoAPI.authorizedFetch("/api/emission/history");
      if (!response.ok) {
        if (isBackendUnavailableStatus(response.status)) {
          enableDemoMode();
          cachedHistory = getDemoHistory();
          renderLineChart(cachedHistory);
          return;
        }
        throw new Error("Failed to fetch emission history.");
      }

      const history = await response.json();
      cachedHistory = Array.isArray(history) ? history : [];
      renderLineChart(cachedHistory);
    } catch (error) {
      enableDemoMode();
      cachedHistory = getDemoHistory();
      renderLineChart(cachedHistory);
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
      type: "pie",
      data: {
        labels: ["Transport", "Electricity", "LPG", "Flights"],
        datasets: [
          {
            data: [values.transport, values.electricity, values.lpg, values.flight],
            backgroundColor: ["#2E7D32", "#66BB6A", "#A5D6A7", "#C8E6C9"]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
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

    const labels = history.map((item, index) => item.month || item.label || `Month ${index + 1}`);
    const totals = history.map((item) => Number(item.total ?? 0));

    lineChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Total CO₂ (kg)",
            data: totals,
            borderColor: "#2E7D32",
            backgroundColor: "rgba(102, 187, 106, 0.25)",
            fill: true,
            tension: 0.3,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  /** Produces eco suggestions based on latest category thresholds. */
  function generateSuggestions(data) {
    const tips = [];

    if (data.electricity > 200) {
      tips.push({
        icon: "💡",
        title: "Switch to LEDs",
        text: "Your electricity usage is high. Replacing bulbs with LEDs can reduce power demand."
      });
    }

    if (data.transport > 300) {
      tips.push({
        icon: "🚌",
        title: "Use Public Transport",
        text: "Your transport footprint is significant. Consider carpooling or public transport twice a week."
      });
    }

    if (data.lpg > 40) {
      tips.push({
        icon: "🍳",
        title: "Consider Induction Cooking",
        text: "Higher LPG usage detected. An induction stove can help lower direct fuel emissions."
      });
    }

    if (tips.length === 0) {
      tips.push({
        icon: "✅",
        title: "Great Progress",
        text: "Your latest values look balanced. Keep tracking monthly to stay consistent."
      });
    }

    suggestionsPanel.innerHTML = "";
    tips.forEach((tip) => {
      const card = document.createElement("article");
      card.className = "suggestion-card";
      card.innerHTML = `<h4>${tip.icon} ${tip.title}</h4><p>${tip.text}</p>`;
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

    if ([vehicleDistance, electricityUsage, lpgUsage, flightDistance].some((value) => value === null)) {
      EcoAPI.showToast("All values must be non-negative numbers.", "error");
      return;
    }

    EcoAPI.setLoading(true);

    try {
      const response = await EcoAPI.authorizedFetch("/api/emission/add", {
        method: "POST",
        body: JSON.stringify({
          vehicleDistance,
          electricityUsage,
          lpgUsage,
          flightDistance
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (isBackendUnavailableStatus(response.status)) {
          enableDemoMode();
          const calculated = calculateEmissionsFromInputs({ vehicleDistance, electricityUsage, lpgUsage, flightDistance });
          cachedHistory = addDemoHistoryEntry(calculated);
          formMessage.textContent = "Saved in demo mode.";
          EcoAPI.showToast("Emission data saved in demo mode.", "success");
          emissionForm.reset();
          await Promise.all([fetchLatestEmission(), fetchHistory()]);
          return;
        }

        EcoAPI.showToast(result.message || "Unable to save emission data.", "error");
        return;
      }

      formMessage.textContent = "Saved successfully.";
      EcoAPI.showToast("Emission data saved.", "success");
      emissionForm.reset();

      await Promise.all([fetchLatestEmission(), fetchHistory()]);
    } catch (error) {
      enableDemoMode();
      const calculated = calculateEmissionsFromInputs({ vehicleDistance, electricityUsage, lpgUsage, flightDistance });
      cachedHistory = addDemoHistoryEntry(calculated);
      formMessage.textContent = "Saved in demo mode.";
      EcoAPI.showToast("Network unavailable, data saved in demo mode.", "success");
      emissionForm.reset();
      await Promise.all([fetchLatestEmission(), fetchHistory()]);
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

    const header = ["month", "total", "transport", "electricity", "lpg", "flight"];
    const rows = cachedHistory.map((item, index) => {
      return [
        item.month || item.label || `Month ${index + 1}`,
        Number(item.total ?? 0),
        Number(item.transport ?? item.transportEmission ?? 0),
        Number(item.electricity ?? item.electricityEmission ?? 0),
        Number(item.lpg ?? item.lpgEmission ?? 0),
        Number(item.flight ?? item.flights ?? item.flightEmission ?? 0)
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

    logoutBtn.addEventListener("click", () => {
      EcoAPI.removeToken();
      window.location.href = "index.html";
    });

    darkModeToggle.addEventListener("click", () => {
      const isDark = EcoAPI.toggleTheme();
      darkModeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    });

    if (document.body.classList.contains("dark")) {
      darkModeToggle.textContent = "☀️ Light Mode";
    }

    emissionForm.addEventListener("submit", handleEmissionSubmit);
    downloadCsvBtn.addEventListener("click", downloadCsv);

    EcoAPI.setLoading(true);
    try {
      await Promise.all([fetchLatestEmission(), fetchHistory()]);
    } catch (error) {
      enableDemoMode();
      cachedHistory = getDemoHistory();
      renderLineChart(cachedHistory);
      applyLatestToUI(cachedHistory.slice(-1)[0] || { transport: 0, electricity: 0, lpg: 0, flight: 0, total: 0 });
    } finally {
      EcoAPI.setLoading(false);
    }
  }

  initializeDashboard();
})();
