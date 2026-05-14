const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'player_movement'
  });
  const [rows] = await connection.query('DESCRIBE season_players');
  console.log(rows);
  connection.end();
}
check().catch(console.error);
