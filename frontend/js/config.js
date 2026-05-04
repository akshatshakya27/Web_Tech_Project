/**
 * EcoTrack Frontend Configuration
 * 
 * Set backend API URL via environment variable or window object.
 * For deployments, inject window.ECOTRACK_CONFIG before loading other scripts.
 */

window.ECOTRACK_CONFIG = window.ECOTRACK_CONFIG || {
  // API_BASE_URL: Read from environment variable (process.env.REACT_APP_API_BASE_URL)
  // For static deployments, set via window object in HTML:
  // <script>window.ECOTRACK_CONFIG = { API_BASE_URL: 'https://api.example.com' }</script>
  //
  // Default to localhost for local development
  API_BASE_URL: "http://localhost:8000"
};
