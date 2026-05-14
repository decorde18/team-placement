const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    await connection.query('ALTER TABLE season_players ADD COLUMN team_id INT(11) DEFAULT NULL');
    console.log('Added team_id to season_players');
  } catch (e) {
    console.log(e.message);
  }

  const [rows] = await connection.query('DESCRIBE season_players');
  console.log('season_players:', rows);
  
  connection.end();
}
check().catch(console.error);
