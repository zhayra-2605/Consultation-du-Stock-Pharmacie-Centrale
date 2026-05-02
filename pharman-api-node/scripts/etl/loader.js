const config = require('./config');
const transformer = require('./transformer');

/**
 * Creates a table based on inferred schema, adding primary keys for persistence.
 */
async function createTable(conn, tableName, cleanCols, schemaMapping) {
  let createTblQuery = `CREATE TABLE \`${tableName}\` (\n`;
  const colDefs = cleanCols.map(c => {
    // Force specific keys for indexing
    if (['CODE_PRODUIT', 'CODE_BESOIN', 'CODEBESOIN', 'code'].includes(c)) {
      return `  \`${c}\` VARCHAR(255)`;
    }
    return `  \`${c}\` ${schemaMapping[c] || 'TEXT'}`;
  }).join(',\n');
  
  createTblQuery += colDefs;

  // Persistence Strategy: Unique Constraints for UPSERT
  if (tableName === 'table_produit') createTblQuery += `,\n  PRIMARY KEY (CODE_PRODUIT)`;
  if (tableName === 'pcodebesoin') createTblQuery += `,\n  PRIMARY KEY (CODE_BESOIN)`;
  if (tableName === 'historique_mouvement') createTblQuery += `,\n  UNIQUE KEY idx_hm_unique (CODE_PRODUIT, ANNEE, MOIS)`;

  createTblQuery += '\n);';
  
  await conn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  await conn.query(createTblQuery);
}

/**
 * Bulk Inserts or Updates (UPSERT) data into a table.
 */
async function bulkInsert(conn, tableName, data, cleanCols, cleanToOriginal) {
  const { batchSize } = config.excel;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const rows = batch.map(row => {
      return cleanCols.map(cleanName => {
        const origName = cleanToOriginal[cleanName];
        return transformer.cleanValue(row[origName]);
      });
    });

    const placeholders = rows.map(() => `(${new Array(cleanCols.length).fill('?').join(', ')})`).join(', ');
    const flattened = rows.flat();

    const updateClause = cleanCols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
    
    const insertQuery = `
      INSERT INTO \`${tableName}\` (${cleanCols.map(c => '\`'+c+'\`').join(', ')}) 
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE ${updateClause}
    `;
    
    await conn.query(insertQuery, flattened);
  }
}

module.exports = {
  createTable,
  bulkInsert
};
