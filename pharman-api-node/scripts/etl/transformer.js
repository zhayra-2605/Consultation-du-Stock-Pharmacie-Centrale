const config = require('./config');

/**
 * Standardizes column names based on business logic.
 */
function getColumnMappings(tableName, headerRow) {
  const cleanCols = [];
  const cleanToOriginal = {};
  const seen = new Set();

  for (let i = 0; i < headerRow.length; i++) {
    const orig = headerRow[i];
    if (orig === null || orig === undefined || orig === '') continue;
    
    const originalStr = String(orig);
    let clean = originalStr.trim();

    // STRICT BUSINESS LOGIC MAPPING
    if (tableName === 'historique_mouvement') {
      if (clean === 'REFPROD') clean = 'CODE_PRODUIT';
      if (clean === 'QTESTK') clean = 'STOCK_TOTAL';
      if (clean === 'QTEVENTE') clean = 'VENTE_TOTAL';
    }
    if (tableName === 'pcodebesoin' && clean === 'CODE') {
      clean = 'CODE_BESOIN';
    }

    // Deduplication logic
    let finalName = clean;
    let counter = 1;
    while (seen.has(finalName)) {
      finalName = `${clean}_${counter++}`;
    }
    seen.add(finalName);
    
    cleanCols.push(finalName);
    cleanToOriginal[finalName] = originalStr;
  }

  return { cleanCols, cleanToOriginal };
}

/**
 * Infers SQL data types based on a sample of rows, with business overrides.
 */
function inferSchema(data, cleanCols) {
  const schema = {};
  
  // 1. Initial defaults based on business logic
  for (const col of cleanCols) {
    const c = col.toUpperCase();
    if (['ANNEE', 'MOIS', 'NB'].some(s => c.includes(s))) {
      schema[col] = 'INT';
    } else if (['CODE', 'LIBELLE', 'REGION', 'DEPOT', 'PAYS', 'NOM', 'ETAT', 'SIGLE', 'LOT'].some(s => c.includes(s))) {
      schema[col] = 'VARCHAR(255)';
    } else if (['STK', 'VTE', 'STOCK', 'VENTE', 'QUANTITE', 'QTE', 'PRIX'].some(s => c.includes(s))) {
      schema[col] = 'DOUBLE';
    } else {
      schema[col] = 'TEXT'; // Default for unknown columns
    }
  }

  // 2. Refine based on data sampling
  const sampleRange = Math.min(data.length, config.excel.sampleSizeForInference);
  for (const col of cleanCols) {
    let hasString = false;
    let hasValue = false;

    for (let i = 0; i < sampleRange; i++) {
      const val = cleanValue(data[i][col]);
      if (val !== null) {
        hasValue = true;
        if (typeof val === 'string' && isNaN(Number(val))) {
          hasString = true;
          break; // It's definitely a string
        }
      }
    }

    // Override if data contradicts business logic (Safety First)
    if (hasString) {
      schema[col] = 'TEXT';
    } else if (hasValue && schema[col] === 'TEXT') {
      schema[col] = 'DOUBLE'; // It looks numeric
    }
  }

  return schema;
}

/**
 * Cleans individual cell values.
 */
function cleanValue(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }
  return val;
}

module.exports = {
  getColumnMappings,
  inferSchema,
  cleanValue
};
