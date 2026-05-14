const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await connection.query('DESCRIBE season_players');
  console.log('season_players:', rows);
  
  const [playerRows] = await connection.query('DESCRIBE players');
  console.log('players:', playerRows);
  
  const [teamRows] = await connection.query('DESCRIBE teams');
  console.log('teams:', teamRows);

  connection.end();
}
check().catch(console.error);
