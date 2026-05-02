const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmacie_centrale',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    multipleStatements: true,
});

const logQueryError = (route, error, params = []) => {
    console.error(`[API ERROR] ${route}:`, error.message);
    if (params.length > 0) console.error('  Params:', params);
};

// --- Dynamic region maps ---
let depotGroups = {};
let depotNameGroups = {};
let regionsMappingDB = {};
const REGIONS_LIST = [];

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
        console.log('[INIT] Regions loaded from DB');
    } catch (err) {
        console.error('[INIT ERROR] Falling back to defaults:', err.message);
        // Minimum fallbacks
        depotGroups = { Tunis: ['STKTUDIPH'], Sfax: ['STKCEPHOP'] };
        REGIONS_LIST.push('Tunis', 'Sfax');
    }
}

const getRegionFields       = (reg) => depotGroups[reg] || [];
const getVenteColsFromReg   = (reg) => getRegionFields(reg).map(f => f.replace('STK', 'VTE'));

const getRegionStockSumFromRow = (reg, row) => {
    const sum = getRegionFields(reg).reduce((s, f) => s + (Number(row[f]) || 0), 0);
    return Math.round(sum);
};

const getRegionVenteSumFromRow = (reg, row) => {
    const sum = getRegionFields(reg).reduce((s, f) => s + (Number(row[f.replace('STK', 'VTE')]) || 0), 0);
    return Math.round(sum);
};

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
