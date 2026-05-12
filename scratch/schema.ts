import db from "@/lib/db";

async function getSchema() {
  const connection = await db.getConnection();
  try {
    const [seasons]: any = await connection.query("DESCRIBE seasons");
    const [events]: any = await connection.query("DESCRIBE events");
    const [age_groups]: any = await connection.query("DESCRIBE age_groups");
    const [season_age_groups]: any = await connection.query("DESCRIBE season_age_groups");
    const [event_divisions]: any = await connection.query("DESCRIBE event_divisions");
    
    console.log("SEASONS", seasons);
    console.log("EVENTS", events);
    console.log("AGE GROUPS", age_groups);
    console.log("SEASON AGE GROUPS", season_age_groups);
    console.log("EVENT DIVISIONS", event_divisions);
  } finally {
    connection.release();
    process.exit(0);
  }
}

getSchema();
