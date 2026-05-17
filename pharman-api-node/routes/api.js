/**
 * routes/api.js
 * Définition des routes principales de l'API.
 * Responsabilité : Mapper les URLs aux fonctions des contrôleurs tout en appliquant la sécurité (authentification et rôles).
 */

const express = require('express');
const router = express.Router();
const { initializeRegions } = require('../utils/db');

// Initialisation des régions au démarrage pour charger les configurations dynamiques
initializeRegions();

// --- IMPORT DES MIDDLEWARES (SÉCURITÉ) ---
const authMiddleware = require('../middleware/authMiddleware'); // Vérifie l'identité
const authorizeRoles = require('../middleware/roleMiddleware'); // Vérifie les permissions (Rôles)
const readOnlyMiddleware = require('../middleware/readOnlyMiddleware'); // Restreint aux lecteurs seuls

// --- IMPORT DES CONTRÔLEURS (LOGIQUE MÉTIER) ---
const { search, getProduit, getProduitsParBesoin } = require('../controllers/productController');
const { getStockSummary, getStockDetails, getStockDetailsBesoin, getStockSummaryBesoin, getLivraisonsBesoin } = require('../controllers/stockController');
const { getStatsProduit, getStatsBesoin, compareRegions, compareRegionsAdvanced } = require('../controllers/statsController');
const { getSituationPredictions } = require('../controllers/predictionController');

// --- DÉFINITION DES POINTS D'ACCÈS (ENDPOINTS) ---

/**
 * Chaque route suit le schéma : 
 * router.get(URL, AUTH_CHECK, ROLE_CHECK, READ_ONLY_FILTER, CONTROLLER_FUNCTION)
 */

// 1. Recherche multicritère
router.get('/search', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, search);

// 2. Fiche détaillée d'un produit spécifique
router.get('/produit/:code', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getProduit);

// 3. Liste des produits liés à un besoin commun
router.get('/produits-par-besoin/:codeBesoin', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getProduitsParBesoin);

// 4. Résumé graphique des stocks par produit (Répartition régionale)
router.get('/stock-summary/:codeProduit', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getStockSummary);

// 5. Détails des lots et péremptions pour un produit et un dépôt spécifique
router.get('/stock-details/:codeProduit/:depot', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getStockDetails);

// 5b. Détails des lots par Besoin
router.get('/stock-details-besoin/:codeBesoin/:depot', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getStockDetailsBesoin);

// 6. Résumé global des stocks pour un groupe de produits (Besoin)
router.get('/stock-summary-besoin/:codeBesoin', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getStockSummaryBesoin);

// 7. Statistiques historiques par produit
router.get('/stats/:codeProduit', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getStatsProduit);

// 8. Statistiques historiques par Besoin
router.get('/stats-besoin/:codeBesoin', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getStatsBesoin);

// 8.5. Historique des livraisons
router.get('/livraisons-besoin/:codeBesoin', authMiddleware, authorizeRoles('ADMIN', 'UBD', 'VIEWER'), readOnlyMiddleware, getLivraisonsBesoin);

// 9. Comparaison de stock/ventes entre toutes les régions (ADMIN uniquement)
router.get('/compare-regions', authMiddleware, authorizeRoles('ADMIN'), compareRegions);

// 10. Analyse avancée des déséquilibres régionaux
router.get('/compare-regions-advanced', authMiddleware, authorizeRoles('ADMIN'), compareRegionsAdvanced);

// 11. Récupération des prédictions générées par le moteur ML (Python)
router.get('/situation/predictions', authMiddleware, authorizeRoles('ADMIN'), getSituationPredictions);

module.exports = router;

