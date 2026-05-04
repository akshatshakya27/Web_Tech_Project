/**
 * EcoTrack Frontend Configuration
 * 
 * Backend API URL is injected via build process using Vercel environment variables.
 * Default: http://localhost:8000 (for local development)
 */

window.ECOTRACK_CONFIG = {
  API_BASE_URL: "{{API_BASE_URL}}"
};

