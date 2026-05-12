import mysql from 'mysql2/promise';

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

const poolConfig = {
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Use a global variable in development to prevent hot-reloads from 
// spinning up new pools and exhausting database connections, or causing ECONNRESET
const pool = globalThis._mysqlPool || mysql.createPool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  globalThis._mysqlPool = pool;
}

export default pool;
