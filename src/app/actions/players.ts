"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getActiveClubId } from "./clubs";
import { syncEventPlayers } from "./events";

export interface UploadedPlayer {
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: string;
  tryoutNumber?: string;
  position?: string;
  rating?: number;
  seasonAgeGroupId?: string;
}

export async function uploadPlayers(players: UploadedPlayer[]) {
  if (!players || players.length === 0) {
    throw new Error("No players provided");
  }

  const clubId = await getActiveClubId();
  if (!clubId) {
    throw new Error("No active club context found");
  }

  // Get a connection from the pool to use transactions if needed
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const affectedSeasonAgeGroupIds = new Set<number>();

    for (const player of players) {
      // 1. Insert or find player in `players` table
      let playerId: number;

      // Basic deduplication check within the club
      const [existingPlayers]: any = await connection.query(
        `SELECT id FROM players WHERE first_name = ? AND last_name = ? AND club_id = ? LIMIT 1`,
        [player.firstName, player.lastName, clubId]
      );

      if (existingPlayers.length > 0) {
        playerId = existingPlayers[0].id;
        
        // Optionally update dob and gender if they are provided
        if (player.dob || player.gender) {
            await connection.query(
                `UPDATE players SET date_of_birth = COALESCE(?, date_of_birth), gender = COALESCE(?, gender) WHERE id = ?`,
                [player.dob || null, player.gender || null, playerId]
            );
        }
      } else {
        const [result]: any = await connection.query(
          `INSERT INTO players (first_name, last_name, date_of_birth, gender, club_id) VALUES (?, ?, ?, ?, ?)`,
          [player.firstName, player.lastName, player.dob || null, player.gender || null, clubId]
        );
        playerId = result.insertId;
      }

      // 2. Insert into `season_players` if division/seasonAgeGroup is provided
      if (player.seasonAgeGroupId) {
        const sagId = parseInt(player.seasonAgeGroupId);
        affectedSeasonAgeGroupIds.add(sagId);

        // Check if already in season_players for this group
        const [existingSeasonPlayer]: any = await connection.query(
            `SELECT id FROM season_players WHERE player_id = ? AND season_age_group_id = ? LIMIT 1`,
            [playerId, sagId]
        );

        if (existingSeasonPlayer.length === 0) {
            await connection.query(
                `INSERT INTO season_players (player_id, season_age_group_id, tryout_number, position, rating) VALUES (?, ?, ?, ?, ?)`,
                [playerId, sagId, player.tryoutNumber || null, player.position || null, player.rating || 0]
            );
        } else {
             // Update if exists
             await connection.query(
                `UPDATE season_players SET tryout_number = COALESCE(?, tryout_number), position = COALESCE(?, position), rating = COALESCE(?, rating) WHERE id = ?`,
                [player.tryoutNumber || null, player.position || null, player.rating || null, existingSeasonPlayer[0].id]
             );
        }
      }
    }

    await connection.commit();

    // 3. Sync all events that include the affected divisions
    if (affectedSeasonAgeGroupIds.size > 0) {
        const [eventsToSync]: any = await connection.query(
            `SELECT DISTINCT event_id FROM event_divisions WHERE season_age_group_id IN (?)`,
            [Array.from(affectedSeasonAgeGroupIds)]
        );

        for (const e of eventsToSync) {
            await syncEventPlayers(e.event_id, connection);
        }
    }

    revalidatePath("/admin/players");
    return { success: true, count: players.length };

  } catch (error) {
    await connection.rollback();
    console.error("Error uploading players:", error);
    throw new Error("Failed to upload players");
  } finally {
    connection.release();
  }
}

export async function getPlayers(seasonAgeGroupId?: string) {
  const clubId = await getActiveClubId();
  if (!clubId) return [];

  const connection = await db.getConnection();
  try {
    let query = `
      SELECT p.id, p.first_name, p.last_name, p.date_of_birth, p.gender, 
             sp.tryout_number, sp.position, sp.rating, sp.season_age_group_id,
             ag.name as age_group_name, sag.gender as division_gender
      FROM players p
      LEFT JOIN season_players sp ON p.id = sp.player_id
      LEFT JOIN season_age_groups sag ON sp.season_age_group_id = sag.id
      LEFT JOIN age_groups ag ON sag.age_group_id = ag.id
      WHERE p.club_id = ?
    `;
    
    const params: any[] = [clubId];

    if (seasonAgeGroupId) {
      query += ` AND sp.season_age_group_id = ?`;
      params.push(parseInt(seasonAgeGroupId));
    }

    query += ` ORDER BY p.last_name, p.first_name`;

    const [rows]: any = await connection.query(query, params);
    return rows;
  } finally {
    connection.release();
  }
}
