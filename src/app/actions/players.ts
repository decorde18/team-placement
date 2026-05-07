"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

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

  // Get a connection from the pool to use transactions if needed
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const player of players) {
      // 1. Insert or find player in `players` table
      // Assuming combination of first_name, last_name, and dob might be somewhat unique, 
      // but for simplicity, we'll just insert unless we implement strict deduplication.
      // Or we can check if they exist.
      
      let playerId: number;

      // Basic deduplication check
      const [existingPlayers]: any = await connection.query(
        `SELECT id FROM players WHERE first_name = ? AND last_name = ? LIMIT 1`,
        [player.firstName, player.lastName]
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
          `INSERT INTO players (first_name, last_name, date_of_birth, gender) VALUES (?, ?, ?, ?)`,
          [player.firstName, player.lastName, player.dob || null, player.gender || null]
        );
        playerId = result.insertId;
      }

      // 2. Insert into `season_players` if division/seasonAgeGroup is provided
      if (player.seasonAgeGroupId) {
        // Check if already in season_players for this group
        const [existingSeasonPlayer]: any = await connection.query(
            `SELECT id FROM season_players WHERE player_id = ? AND season_age_group_id = ? LIMIT 1`,
            [playerId, parseInt(player.seasonAgeGroupId)]
        );

        if (existingSeasonPlayer.length === 0) {
            await connection.query(
                `INSERT INTO season_players (player_id, season_age_group_id, tryout_number, position, rating) VALUES (?, ?, ?, ?, ?)`,
                [playerId, parseInt(player.seasonAgeGroupId), player.tryoutNumber || null, player.position || null, player.rating || 0]
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
