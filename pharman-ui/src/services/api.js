import axios from 'axios';
import { API_PATHS } from '../config/api.config';

const apiClient = axios.create({
  baseURL: API_PATHS.api,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    window.location.reload();
  }
  return Promise.reject(error);
});

export const authApi = {
  login: (matricule, password, email) => apiClient.post('/auth/login', { matricule, password, email }),
  forgotPassword: (matricule, email) => apiClient.post('/auth/forgot-password', { matricule, email }),
  resetPassword: (matricule, code, newPassword) => apiClient.post('/auth/reset-password', { matricule, code, newPassword }),
};

export const api = {
  search: (critere, valeur) =>
    apiClient.get('/search', { params: { critere, valeur } }),
  getProduitDetails: (codeProduit) =>
    apiClient.get(`/produit/${encodeURIComponent(codeProduit)}`),
  getStockSummary: (codeProduit) =>
    apiClient.get(`/stock-summary/${encodeURIComponent(codeProduit)}`),
  getStockSummaryByBesoin: (codeBesoin) =>
    apiClient.get(`/stock-summary-besoin/${encodeURIComponent(codeBesoin)}`),
  getStockDetails: (codeProduit, depot) =>
    apiClient.get(
      `/stock-details/${encodeURIComponent(codeProduit)}/${encodeURIComponent(depot)}`,
    ),
  getStockDetailsByBesoin: (codeBesoin, depot) =>
    apiClient.get(
      `/stock-details-besoin/${encodeURIComponent(codeBesoin)}/${encodeURIComponent(depot)}`,
    ),
  getProduitsParBesoin: (codeBesoin) =>
    apiClient.get(`/produits-par-besoin/${encodeURIComponent(codeBesoin)}`),
  getStats: (codeProduit) =>
    apiClient.get(`/stats/${encodeURIComponent(codeProduit)}`),
  getStatsByBesoin: (codeBesoin) =>
    apiClient.get(`/stats-besoin/${encodeURIComponent(codeBesoin)}`),
  compareRegions: (code, isBesoin, regionA, regionB, months) =>
    apiClient.get('/compare-regions', {
        params: { code, isBesoin, regionA, regionB, months }
    }),
  compareRegionsAdvanced: (params) =>
    apiClient.get('/compare-regions-advanced', { params }),
  getLivraisonsByBesoin: (codeBesoin) =>
    apiClient.get(`/livraisons-besoin/${encodeURIComponent(codeBesoin)}`),
  getSituationPredictions: (hubId, period) =>
    apiClient.get('/situation/predictions', { params: { hubId, period } }),
};
