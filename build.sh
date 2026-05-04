#!/bin/bash
# Build script for Vercel deployment
# Reads API_BASE_URL from environment variable and injects it into config.js

set -e

# Get API_BASE_URL from environment, default to http://localhost:8000
API_BASE_URL=${API_BASE_URL:-"http://localhost:8000"}

echo "🔧 Injecting API_BASE_URL: $API_BASE_URL"

# Replace placeholder in config.js
sed -i "s|{{API_BASE_URL}}|$API_BASE_URL|g" frontend/js/config.js

echo "✅ Config injected successfully"
