const mysql = require('mysql2/promise');
const config = require('./config');

let connection;

async function connect(useDb = true) {
  const connectionConfig = {
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  };
  
  if (useDb) {
    connectionConfig.database = config.db.database;
  }
  
  connection = await mysql.createConnection(connectionConfig);
  return connection;
}

async function disconnect() {
  if (connection) {
    await connection.end();
  }
}

module.exports = {
  connect,
  disconnect,
  getConn: () => connection
};
