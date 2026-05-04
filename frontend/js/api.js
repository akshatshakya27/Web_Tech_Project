/**
 * EcoAPI Module
 * Centralized API communication and utility layer
 */

window.EcoAPI = (() => {
  // Configuration
  // Set the backend URL in js/config.js before deploying the frontend.
  const API_BASE_URL = window.EcoTrackConfig?.API_BASE_URL || "http://localhost:8000";
  const TOKEN_KEY = "ecotrack_token";
  const LOADING_OVERLAY_ID = "loadingOverlay";
  const TOAST_CONTAINER_ID = "toastContainer";

  // =====================
  // Token Management
  // =====================

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  // =====================
  // JWT Parsing
  // =====================

  function parseJwtPayload(token) {
    if (!token || typeof token !== "string") {
      return null;
    }

    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error("Failed to parse JWT:", error);
      return null;
    }
  }

  // =====================
  // Fetch with Auth
  // =====================

  async function authorizedFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
      "Content-Type": "application/json",
      ...options.headers
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      return response;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }

  // =====================
  // Loading Indicator
  // =====================

  function setLoading(isLoading) {
    const overlay = document.getElementById(LOADING_OVERLAY_ID);
    if (!overlay) {
      return;
    }

    if (isLoading) {
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
  }

  // =====================
  // Toast Notifications
  // =====================

  function showToast(message, type = "info", duration = 3000) {
    const container = document.getElementById(TOAST_CONTAINER_ID);
    if (!container) {
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;

    container.appendChild(toast);

    // Remove after duration
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.animation = "none";
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // =====================
  // Logout
  // =====================

  function logout() {
    clearToken();
    localStorage.removeItem("ecotrack_user");
    window.location.href = "index.html";
  }

  // =====================
  // Public API
  // =====================

  return {
    getToken,
    setToken,
    clearToken,
    removeToken: clearToken,  // Alias for compatibility
    parseJwtPayload,
    authorizedFetch,
    setLoading,
    showToast,
    logout,
    API_BASE_URL
  };
})();
