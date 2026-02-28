/*
 * EcoTrack API Utilities
 * - Centralizes token storage, authenticated requests, and shared UI helpers.
 * - Exposes helper methods on window.EcoAPI for use in auth.js and dashboard.js.
 */

(function initializeEcoAPI() {
  const TOKEN_KEY = "ecotrack_token";
  const THEME_KEY = "ecotrack_theme";

  /** Returns the currently stored JWT token. */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Stores JWT token in localStorage. */
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /** Removes JWT token from localStorage. */
  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Performs a fetch call with optional JSON payload and auto-Authorization header.
   * Handles 401 responses by clearing token and redirecting to login page.
   */
  async function authorizedFetch(url, options = {}) {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      removeToken();
      if (!window.location.pathname.endsWith("index.html")) {
        showToast("Session expired. Please login again.", "error");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 600);
      }
    }

    return response;
  }

  /** Toggles fullscreen loading overlay visibility. */
  function setLoading(isLoading) {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.classList.toggle("hidden", !isLoading);
    overlay.setAttribute("aria-hidden", String(!isLoading));
  }

  /** Creates a toast notification with auto-dismiss behavior. */
  function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /** Reads user payload from JWT token safely. */
  function parseJwtPayload(token) {
    if (!token) return null;

    try {
      const payloadPart = token.split(".")[1];
      if (!payloadPart) return null;

      const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, "="));
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }

  /** Applies persisted theme preference on page load. */
  function applySavedTheme() {
    const theme = localStorage.getItem(THEME_KEY) || "light";
    document.body.classList.toggle("dark", theme === "dark");
  }

  /** Toggles dark mode and persists preference. */
  function toggleTheme() {
    const nowDark = document.body.classList.toggle("dark");
    localStorage.setItem(THEME_KEY, nowDark ? "dark" : "light");
    return nowDark;
  }

  window.EcoAPI = {
    getToken,
    setToken,
    removeToken,
    authorizedFetch,
    setLoading,
    showToast,
    parseJwtPayload,
    applySavedTheme,
    toggleTheme
  };
})();
