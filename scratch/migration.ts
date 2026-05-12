import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
}

async function run() {
  const db = (await import("../src/lib/db")).default;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log("Creating clubs table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Inserting default club...");
    const [clubRes]: any = await connection.query(`INSERT INTO clubs (name) VALUES ('Default Club')`);
    const defaultClubId = clubRes.insertId;

    console.log("Updating users table...");
    // We need to modify role enum and add club_id
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('system_admin', 'club_admin', 'coach') NOT NULL DEFAULT 'coach'
    `);
    
    // Convert existing 'admin' to 'system_admin'
    // MySQL might have already errored if 'admin' isn't in the new enum, let's do it safer.
    // Actually ALTER TABLE MODIFY COLUMN will fail if data has 'admin'. We need to add 'system_admin', 'club_admin', 'admin', then update, then remove 'admin'.
    await connection.query(`ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'system_admin', 'club_admin', 'coach') NOT NULL DEFAULT 'coach'`);
    await connection.query(`UPDATE users SET role = 'system_admin' WHERE role = 'admin'`);
    await connection.query(`ALTER TABLE users MODIFY COLUMN role ENUM('system_admin', 'club_admin', 'coach') NOT NULL DEFAULT 'coach'`);

    try {
      await connection.query(`ALTER TABLE users ADD COLUMN club_id INT DEFAULT NULL`);
      await connection.query(`ALTER TABLE users ADD CONSTRAINT fk_user_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL`);
      await connection.query(`UPDATE users SET club_id = ?`, [defaultClubId]);
    } catch (e: any) {
        if (!e.message.includes("Duplicate column name")) throw e;
    }

    console.log("Updating teams table...");
    try {
      await connection.query(`ALTER TABLE teams ADD COLUMN club_id INT DEFAULT NULL`);
      await connection.query(`ALTER TABLE teams ADD CONSTRAINT fk_team_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE`);
      await connection.query(`UPDATE teams SET club_id = ?`, [defaultClubId]);
    } catch (e: any) {
        if (!e.message.includes("Duplicate column name")) throw e;
    }

    console.log("Updating players table...");
    try {
      await connection.query(`ALTER TABLE players ADD COLUMN club_id INT DEFAULT NULL`);
      await connection.query(`ALTER TABLE players ADD CONSTRAINT fk_player_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE`);
      await connection.query(`UPDATE players SET club_id = ?`, [defaultClubId]);
    } catch (e: any) {
        if (!e.message.includes("Duplicate column name")) throw e;
    }

    console.log("Creating club_seasons table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS club_seasons (
        club_id INT NOT NULL,
        season_id INT NOT NULL,
        PRIMARY KEY (club_id, season_id),
        FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
        FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
      )
    `);

    // Assign existing seasons to default club
    await connection.query(`
      INSERT IGNORE INTO club_seasons (club_id, season_id)
      SELECT ?, id FROM seasons
    `, [defaultClubId]);

    await connection.commit();
    console.log("Migration complete!");

  } catch (error) {
    await connection.rollback();
    console.error("Migration failed:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
