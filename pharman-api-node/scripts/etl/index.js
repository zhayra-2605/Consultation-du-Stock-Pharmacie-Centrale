const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./db');
const logger = require('./logger');
const extractor = require('./extractor');
const transformer = require('./transformer');
const loader = require('./loader');
const queries = require('./sql_queries');

async function run() {
  logger.info('Starting Professional ETL Pipeline...');
  let conn;

  try {
    // Phase 1: Connection & DB Setup
    logger.step(1, 'Database Maintenance');
    conn = await db.connect(false);
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${config.db.database}`);
    await conn.query(`USE ${config.db.database}`);
    
    logger.info('Initializing reference tables...');
    await conn.query(queries.createRefRegions.drop);
    await conn.query(queries.createRefRegions.create);
    await conn.query(queries.createRefRegions.insert);
    
    logger.success(`Database ${config.db.database} ready and persisted.`);

    // Phase 2: Extraction & Loading
    logger.step(2, 'Excel Processing (E & L)');
    const files = fs.readdirSync(config.excel.rawDir).filter(f => f.endsWith('.xlsx'));
    
    for (const file of files) {
      const tableName = file.replace('.xlsx', '').toLowerCase();
      logger.info(`Processing: ${file} -> ${tableName}`);
      
      const { data, headerRow } = extractor.readExcel(file);
      if (data.length === 0) {
        logger.warn(`Skipping empty file: ${file}`);
        continue;
      }

      const { cleanCols, cleanToOriginal } = transformer.getColumnMappings(tableName, headerRow);
      const schemaMapping = transformer.inferSchema(data, cleanCols);

      await loader.createTable(conn, tableName, cleanCols, schemaMapping);
      await loader.bulkInsert(conn, tableName, data, cleanCols, cleanToOriginal);
      
      logger.success(`Table ${tableName} loaded successfully.`);
    }

    // Phase 3: Transformations (T)
    logger.step(3, 'Star Schema & Custom Transformations');
    
    logger.info('Adding indexes...');
    for (const query of queries.addIndexes) {
      await conn.query(query);
    }

    logger.info('Populating CODE_BESOIN in fact table...');
    await conn.query(queries.populateCodeBesoin.addColumn);
    await conn.query(queries.populateCodeBesoin.update);
    await conn.query(queries.populateCodeBesoin.index);

    logger.info('Creating analytic tables...');
    await conn.query(queries.createProduitMouvement.drop);
    await conn.query(queries.createProduitMouvement.create);

    logger.info('Materializing Star Schema...');
    for (const cleanupQuery of queries.createStarSchema.cleanup) {
      await conn.query(cleanupQuery);
    }

    // Dimension: Produit
    await conn.query(queries.createStarSchema.dimProduit.drop);
    await conn.query(queries.createStarSchema.dimProduit.create);
    await conn.query(queries.createStarSchema.dimProduit.index);

    // Dimension: Besoin
    await conn.query(queries.createStarSchema.dimBesoin.drop);
    await conn.query(queries.createStarSchema.dimBesoin.create);
    await conn.query(queries.createStarSchema.dimBesoin.index);

    // Fact: Mouvements
    await conn.query(queries.createStarSchema.factMouvements.drop);
    await conn.query(queries.createStarSchema.factMouvements.create);
    for (const idx of queries.createStarSchema.factMouvements.indexes) {
      await conn.query(idx);
    }

    logger.info('Materializing analytics tables (unpivoted)...');
    await conn.query(queries.createAnalyticsTables);

    logger.success('ETL PIPELINE COMPLETED SUCCESSFULLY.');

  } catch (err) {
    logger.error('CRITICAL PIPELINE FAILURE', err);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

run();
