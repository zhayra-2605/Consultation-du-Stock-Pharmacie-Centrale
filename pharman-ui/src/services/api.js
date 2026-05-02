import axios from 'axios';
import { API_PATHS } from '../config/api.config';

const apiClient = axios.create({
  baseURL: API_PATHS.api,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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
