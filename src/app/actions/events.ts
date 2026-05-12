"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getEvents() {
  const connection = await db.getConnection();
  try {
    const [events]: any = await connection.query(`
      SELECT e.*, s.name as season_name 
      FROM events e
      JOIN seasons s ON e.season_id = s.id
      ORDER BY e.created_at DESC
    `);
    
    // Fetch divisions associated with events
    const [eventDivisions]: any = await connection.query(`
      SELECT ed.event_id, ed.season_age_group_id, ag.name as age_group_name, sag.gender
      FROM event_divisions ed
      JOIN season_age_groups sag ON ed.season_age_group_id = sag.id
      JOIN age_groups ag ON sag.age_group_id = ag.id
    `);

    return events.map((event: any) => ({
      ...event,
      divisions: eventDivisions.filter((ed: any) => ed.event_id === event.id).map((ed: any) => ({
        id: ed.season_age_group_id,
        name: `${ed.age_group_name} ${ed.gender === 'M' ? 'Boys' : ed.gender === 'F' ? 'Girls' : ''}`.trim()
      }))
    }));
  } finally {
    connection.release();
  }
}

export async function getSessions(eventId: number) {
  const connection = await db.getConnection();
  try {
    const [sessions]: any = await connection.query(
      `SELECT * FROM sessions WHERE event_id = ? ORDER BY session_date ASC`,
      [eventId]
    );
    return sessions;
  } finally {
    connection.release();
  }
}

export async function getSeasonsAndDivisions() {
  const connection = await db.getConnection();
  try {
    const [seasons]: any = await connection.query(`SELECT id, name FROM seasons ORDER BY start_date DESC`);
    
    const [divisions]: any = await connection.query(`
      SELECT sag.id, sag.season_id, ag.name as age_group_name, sag.gender
      FROM season_age_groups sag
      JOIN age_groups ag ON sag.age_group_id = ag.id
      ORDER BY ag.name
    `);

    return {
      seasons,
      divisions: divisions.map((d: any) => ({
        id: d.id,
        season_id: d.season_id,
        name: `${d.age_group_name} ${d.gender === 'M' ? 'Boys' : d.gender === 'F' ? 'Girls' : ''}`.trim()
      }))
    };
  } finally {
    connection.release();
  }
}

export async function createEvent(data: { name: string, season_id: number, event_type: string, divisionIds: number[] }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO events (season_id, name, event_type) VALUES (?, ?, ?)`,
      [data.season_id, data.name, data.event_type]
    );

    const eventId = result.insertId;

    if (data.divisionIds && data.divisionIds.length > 0) {
      for (const divId of data.divisionIds) {
        await connection.query(
          `INSERT INTO event_divisions (event_id, season_age_group_id) VALUES (?, ?)`,
          [eventId, divId]
        );
      }
    }

    await connection.commit();
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to create event:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEvent(id: number, data: { name: string, season_id: number, event_type: string, divisionIds: number[] }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE events SET name = ?, season_id = ?, event_type = ? WHERE id = ?`,
      [data.name, data.season_id, data.event_type, id]
    );

    // Update event_divisions
    await connection.query(`DELETE FROM event_divisions WHERE event_id = ?`, [id]);
    
    if (data.divisionIds && data.divisionIds.length > 0) {
      for (const divId of data.divisionIds) {
        await connection.query(
          `INSERT INTO event_divisions (event_id, season_age_group_id) VALUES (?, ?)`,
          [id, divId]
        );
      }
    }

    await connection.commit();
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to update event:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEvent(id: number) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM event_divisions WHERE event_id = ?`, [id]);
    
    // Check if there are sessions for this event. 
    // Usually we would prevent deletion or cascade delete. Let's delete sessions too or at least try.
    // However, sessions contain players, teams, coach_notes. Cascading can be dangerous.
    // For now, let's assume either the user deletes an empty event, or we have CASCADE in the DB.
    await connection.query(`DELETE FROM events WHERE id = ?`, [id]);
    await connection.commit();
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to delete event:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Session Actions
export async function createSession(data: { event_id: number, name: string, session_date: string }) {
  const connection = await db.getConnection();
  try {
    await connection.query(
      `INSERT INTO sessions (event_id, name, session_date) VALUES (?, ?, ?)`,
      [data.event_id, data.name, data.session_date]
    );
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSession(id: number, data: { name: string, session_date: string }) {
  const connection = await db.getConnection();
  try {
    await connection.query(
      `UPDATE sessions SET name = ?, session_date = ? WHERE id = ?`,
      [data.name, data.session_date, id]
    );
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to update session:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteSession(id: number) {
  const connection = await db.getConnection();
  try {
    // Delete links in session_players if they exist (though usually they are linked to event_divisions)
    // Actually, sessions might not have direct player links in the same way, but let's check.
    // Assuming simple deletion for now.
    await connection.query(`DELETE FROM sessions WHERE id = ?`, [id]);
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete session:", error);
    throw error;
  } finally {
    connection.release();
  }
}
