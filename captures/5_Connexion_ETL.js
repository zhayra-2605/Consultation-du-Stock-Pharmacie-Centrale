const mysql = require('mysql2/promise');
const config = require('./config');

// Fonction asynchrone de connexion à MySQL
async function connect(useDb = true) {
  const connectionConfig = {
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  };
  if (useDb) connectionConfig.database = config.db.database;
  
  const connection = await mysql.createConnection(connectionConfig);
  return connection;
}

// Extrait du script point d'entrée de l'ETL
async function runETL() {
  try {
    logger.step(1, 'Database Initialization');
    conn = await connect(false); 
    
    await conn.query(`DROP DATABASE IF EXISTS ${config.db.database}`);
    await conn.query(`CREATE DATABASE ${config.db.database}`);
    await conn.query(`USE ${config.db.database}`);
    
    logger.success(`Connexion établie. Base de données ${config.db.database} prête.`);
    // La phase d'Extraction & Chargement commence ici...
  } catch (err) {
    logger.error('CRITICAL PIPELINE FAILURE', err);
  }
}
