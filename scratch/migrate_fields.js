
const db = require('./src/lib/db').default;

async function migrate() {
  const connection = await db.getConnection();
  try {
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
      await connection.query('ALTER TABLE session_players ADD FOREIGN KEY (field_id) REFERENCES session_fields(id) ON DELETE SET NULL');
    }

    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    connection.release();
    process.exit();
  }
}

migrate();
