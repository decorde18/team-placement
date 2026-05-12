"use server";

import db from "@/lib/db";

export async function getSeasons() {
  const connection = await db.getConnection();
  try {
    const [seasons]: any = await connection.query(`SELECT * FROM seasons ORDER BY start_date DESC`);
    
    // Fetch age groups associated with seasons
    const [seasonAgeGroups]: any = await connection.query(`
      SELECT sag.id, sag.season_id, sag.age_group_id, sag.gender, ag.name as age_group_name
      FROM season_age_groups sag
      JOIN age_groups ag ON sag.age_group_id = ag.id
    `);

    return seasons.map((season: any) => ({
      ...season,
      seasonAgeGroups: seasonAgeGroups.filter((sag: any) => sag.season_id === season.id)
    }));
  } finally {
    connection.release();
  }
}

export async function getGlobalAgeGroups() {
  const connection = await db.getConnection();
  try {
    const [ageGroups]: any = await connection.query(`SELECT * FROM age_groups ORDER BY name`);
    return ageGroups;
  } finally {
    connection.release();
  }
}

export async function createSeason(data: { name: string, start_date?: string, end_date?: string, ageGroupIds: { ageGroupId: number, gender: string }[] }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)`,
      [data.name, data.start_date || null, data.end_date || null]
    );

    const seasonId = result.insertId;

    if (data.ageGroupIds && data.ageGroupIds.length > 0) {
      for (const ag of data.ageGroupIds) {
        await connection.query(
          `INSERT INTO season_age_groups (season_id, age_group_id, gender) VALUES (?, ?, ?)`,
          [seasonId, ag.ageGroupId, ag.gender]
        );
      }
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to create season:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSeason(id: number, data: { name: string, start_date?: string, end_date?: string, ageGroupIds: { ageGroupId: number, gender: string }[] }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE seasons SET name = ?, start_date = ?, end_date = ? WHERE id = ?`,
      [data.name, data.start_date || null, data.end_date || null, id]
    );

    // Delete old season age groups not in new list, add new ones
    await connection.query(`DELETE FROM season_age_groups WHERE season_id = ?`, [id]);
    
    if (data.ageGroupIds && data.ageGroupIds.length > 0) {
      for (const ag of data.ageGroupIds) {
        await connection.query(
          `INSERT INTO season_age_groups (season_id, age_group_id, gender) VALUES (?, ?, ?)`,
          [id, ag.ageGroupId, ag.gender]
        );
      }
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to update season:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteSeason(id: number) {
  const connection = await db.getConnection();
  try {
    // Foreign key constraints should handle deleting season_age_groups, events, etc.
    // If not, we should do it manually. Assume they are CASCADE for now, or just delete them.
    await connection.beginTransaction();
    await connection.query(`DELETE FROM event_divisions WHERE season_age_group_id IN (SELECT id FROM season_age_groups WHERE season_id = ?)`, [id]);
    await connection.query(`DELETE FROM season_age_groups WHERE season_id = ?`, [id]);
    await connection.query(`DELETE FROM events WHERE season_id = ?`, [id]);
    await connection.query(`DELETE FROM seasons WHERE id = ?`, [id]);
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to delete season:", error);
    throw error;
  } finally {
    connection.release();
  }
}
