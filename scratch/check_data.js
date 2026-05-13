
const db = require('./src/lib/db').default;

async function checkData() {
  const connection = await db.getConnection();
  try {
    const [players] = await connection.query('SELECT id, first_name, last_name FROM players LIMIT 5');
    console.log('Sample Players:', players);

    const [seasonPlayers] = await connection.query('SELECT player_id, season_age_group_id FROM season_players LIMIT 5');
    console.log('Sample Season Players:', seasonPlayers);

    const [sessionPlayers] = await connection.query('SELECT player_id, session_id, team_id FROM session_players LIMIT 5');
    console.log('Sample Session Players:', sessionPlayers);

    const [divisions] = await connection.query('SELECT id, age_group_id FROM season_age_groups LIMIT 5');
    console.log('Sample Divisions:', divisions);
    
    const [sessions] = await connection.query('SELECT id, event_id, name FROM sessions LIMIT 5');
    console.log('Sample Sessions:', sessions);

  } catch (err) {
    console.error(err);
  } finally {
    connection.release();
    process.exit();
  }
}

checkData();
