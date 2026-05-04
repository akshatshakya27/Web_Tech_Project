#!/usr/bin/env node
/**
 * Build script for Vercel
 * Injects API_BASE_URL environment variable into frontend/js/config.js
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'frontend', 'js', 'config.js');
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';

console.log(`🔧 Injecting API_BASE_URL: ${apiBaseUrl}`);

try {
  let configContent = fs.readFileSync(configPath, 'utf-8');
  configContent = configContent.replace(/{{API_BASE_URL}}/g, apiBaseUrl);
  fs.writeFileSync(configPath, configContent, 'utf-8');
  console.log('✅ Config injected successfully');
} catch (error) {
  console.error('❌ Error injecting config:', error.message);
  process.exit(1);
}
