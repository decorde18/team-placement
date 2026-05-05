import mysql from 'mysql2/promise';

// Create a connection pool to avoid opening a new connection for every query.
// A connection pool manages multiple connections dynamically.
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
