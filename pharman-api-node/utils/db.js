/**
 * utils/db.js
 * Configuration de la base de données et utilitaires globaux.
 * Responsabilité : Gérer la connexion MySQL, initialiser les régions et fournir des fonctions de calcul sur les stocks.
 */

const mysql = require('mysql2/promise');

// --- CONFIGURATION DU POOL DE CONNEXION ---
// On utilise un 'pool' pour réutiliser les connexions et améliorer les performances.
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmacie_centrale',
    waitForConnections: true, // Attend qu'une connexion se libère si le pool est plein
    connectionLimit: 10,      // Nombre maximum de connexions simultanées
    queueLimit: 0,            // Pas de limite de file d'attente
    dateStrings: true,        // Récupère les dates sous forme de chaînes pour éviter les décalages de fuseau horaire
    multipleStatements: true, // Autorise l'exécution de plusieurs requêtes SQL en une fois
});

/**
 * Log les erreurs SQL de manière uniforme.
 */
const logQueryError = (route, error, params = []) => {
    console.error(`[ERREUR API] ${route}:`, error.message);
    if (params.length > 0) console.error('  Paramètres:', params);
};

// --- LOGIQUE DYNAMIQUE DES RÉGIONS ---
// Ces variables stockent les configurations chargées depuis la table 'ref_regions'.
let depotGroups = {};      // Mappe une région aux colonnes de stock (ex: Tunis -> [STKTUDIPH])
let depotNameGroups = {};  // Mappe une région aux noms réels des dépôts
let regionsMappingDB = {}; // Mappe les codes DB vers les labels lisibles
const REGIONS_LIST = [];   // Liste simple des noms de régions

/**
 * Charge les configurations des régions depuis la base de données au démarrage.
 * Cela permet d'ajouter des régions sans modifier le code.
 */
async function initializeRegions() {
    try {
        const [rows] = await pool.execute('SELECT * FROM ref_regions');
        rows.forEach(r => {
            depotGroups[r.label]      = r.stk_fields.split(',');
            depotNameGroups[r.label]  = r.depot_names.split(',');
            regionsMappingDB[r.db_key] = r.label;
            REGIONS_LIST.push(r.label);
        });
        regionsMappingDB['NATIONAL'] = 'National';
        depotNameGroups['National']  = null;
        console.log('[INIT] Régions chargées depuis la DB');
    } catch (err) {
        console.error('[INIT ERROR] Erreur de chargement, utilisation des valeurs par défaut :', err.message);
        // Valeurs de secours en cas d'échec de la DB
        depotGroups = { Tunis: ['STKTUDIPH'], Sfax: ['STKCEPHOP'] };
        REGIONS_LIST.push('Tunis', 'Sfax');
    }
}

// Fonctions utilitaires pour récupérer les colonnes SQL selon la région choisie
const getRegionFields       = (reg) => depotGroups[reg] || [];
const getVenteColsFromReg   = (reg) => getRegionFields(reg).map(f => f.replace('STK', 'VTE'));

/**
 * Calcule la somme du stock pour une région donnée à partir d'une ligne de résultat SQL.
 */
const getRegionStockSumFromRow = (reg, row) => {
    const sum = getRegionFields(reg).reduce((s, f) => s + (Number(row[f]) || 0), 0);
    return Math.round(sum);
};

/**
 * Calcule la somme des ventes pour une région donnée.
 */
const getRegionVenteSumFromRow = (reg, row) => {
    const sum = getRegionFields(reg).reduce((s, f) => s + (Number(row[f.replace('STK', 'VTE')]) || 0), 0);
    return Math.round(sum);
};

/**
 * Ajuste le stock National pour s'assurer qu'il est au moins égal à la somme des régions.
 */
const correctNational = (result) => {
    const sumRegions = result.filter(r => r.depot !== 'National').reduce((s, r) => s + r.totalStock, 0);
    const nat = result.find(r => r.depot === 'National');
    if (nat) nat.totalStock = Math.max(nat.totalStock, sumRegions);
};

module.exports = {
    pool,
    logQueryError,
    initializeRegions,
    getRegionFields,
    getVenteColsFromReg,
    getRegionStockSumFromRow,
    getRegionVenteSumFromRow,
    correctNational,
    REGIONS_LIST,
    regionsMappingDB,
    depotNameGroups
};

