/**
 * Configuration de l'API
 * En dev: utilise le proxy (package.json) → /api pointe vers localhost:8000
 * REACT_APP_API_URL pour override (ex: http://localhost:8000)
 */
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const API_PATHS = {
  api: BASE ? `${BASE}/api` : '/api',
};
