
const mysql = require('mysql2/promise');

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection("mysql://u676616277_team_creation:Latin4488hos1*@srv903.hstgr.io:3306/u676616277_team_creation");
    
    console.log('Creating session_fields table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS session_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        sort_by VARCHAR(50) DEFAULT 'name',
        sort_direction ENUM('asc', 'desc') DEFAULT 'asc',
        filter_by VARCHAR(50) DEFAULT 'all',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Checking for field_id column in session_players...');
    const [columns] = await connection.query('SHOW COLUMNS FROM session_players LIKE "field_id"');
    if (columns.length === 0) {
      console.log('Adding field_id column...');
      await connection.query('ALTER TABLE session_players ADD COLUMN field_id INT DEFAULT NULL');
      // Note: We'll skip the FK constraint if it's too complex for a scratch script, 
      // but it's better to have it.
    }

    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    if (connection) await connection.end();
    process.exit();
  }
}

migrate();
