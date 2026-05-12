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
    const [users]: any = await connection.query(`DESCRIBE users`);
    console.log("USERS:");
    console.table(users);
    
    // Also check if clubs table exists
    try {
        const [clubs]: any = await connection.query(`DESCRIBE clubs`);
        console.log("CLUBS:");
        console.table(clubs);
    } catch (e) {
        console.log("CLUBS table does not exist.");
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
