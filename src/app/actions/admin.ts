"use server";

import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getActiveClubId } from "./clubs";

// Users
export async function getUsers() {
  const clubId = await getActiveClubId();
  if (!clubId) return [];

  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.assigned_team_id, t.name as team_name 
     FROM users u 
     LEFT JOIN teams t ON u.assigned_team_id = t.id
     WHERE u.club_id = ? OR u.role = 'system_admin'
     ORDER BY u.created_at DESC`,
    [clubId]
  );
  return rows as any[];
}

export async function createUser(formData: FormData) {
  const clubId = await getActiveClubId();
  if (!clubId) throw new Error("No active club context");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    throw new Error("All fields are required");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (name, email, role, password_hash, club_id) VALUES (?, ?, ?, ?, ?)`,
    [name, email, role, hashedPassword, clubId]
  );

  revalidatePath("/admin/users");
}

export async function updateUser(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const password = formData.get("password") as string;

  if (!id || !name || !email || !role) {
    throw new Error("Missing required fields");
  }

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      `UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?`,
      [name, email, role, hashedPassword, parseInt(id)]
    );
  } else {
    await db.query(
      `UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?`,
      [name, email, role, parseInt(id)]
    );
  }

  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const id = formData.get("id") as string;

  if (!id) {
    throw new Error("User ID is required");
  }

  await db.query(`DELETE FROM users WHERE id = ?`, [parseInt(id)]);
  
  revalidatePath("/admin/users");
}

// Seasons & Hierarchy
export async function getSeasonsHierarchy() {
  const clubId = await getActiveClubId();
  if (!clubId) return { seasons: [], divisions: [], teams: [] };

  const [seasons]: any = await db.query(`SELECT * FROM seasons ORDER BY start_date DESC`);
  
  const [clubSeasons]: any = await db.query(`
    SELECT season_id FROM club_seasons WHERE club_id = ?
  `, [clubId]);
  
  const joinedSeasonIds = new Set(clubSeasons.map((cs: any) => cs.season_id));

  const [divisions]: any = await db.query(`
    SELECT sag.id, sag.season_id, sag.gender, ag.name as age_group_name
    FROM season_age_groups sag
    JOIN age_groups ag ON sag.age_group_id = ag.id
  `);

  const [teams]: any = await db.query(`SELECT * FROM teams WHERE club_id = ?`, [clubId]);

  return { seasons, joinedSeasonIds: Array.from(joinedSeasonIds), divisions, teams };
}

export async function createSeason(formData: FormData) {
  const clubId = await getActiveClubId();
  if (!clubId) throw new Error("No active club");

  const name = formData.get("name") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!name || !startDate || !endDate) throw new Error("Missing fields");

  // Create global season
  const [res]: any = await db.query(`INSERT INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)`, [name, startDate, endDate]);
  const newSeasonId = res.insertId;

  // Auto opt-in the current club
  await db.query(`INSERT INTO club_seasons (club_id, season_id) VALUES (?, ?)`, [clubId, newSeasonId]);
  
  revalidatePath("/admin/teams");
}

export async function createDivision(formData: FormData) {
  const clubId = await getActiveClubId();
  if (!clubId) throw new Error("No active club");

  const seasonId = formData.get("seasonId") as string;
  const ageGroupName = formData.get("ageGroupName") as string;
  const dobStart = formData.get("dobStart") as string;
  const dobEnd = formData.get("dobEnd") as string;
  const gender = formData.get("gender") as string;

  if (!seasonId || !ageGroupName || !dobStart || !dobEnd || !gender) throw new Error("Missing fields");

  // 1. Check if age group exists
  let ageGroupId: number;
  const [existingAg]: any = await db.query(`SELECT id FROM age_groups WHERE name = ? LIMIT 1`, [ageGroupName]);
  
  if (existingAg.length > 0) {
    ageGroupId = existingAg[0].id;
    // Optionally update dates
    await db.query(`UPDATE age_groups SET dob_start = ?, dob_end = ? WHERE id = ?`, [dobStart, dobEnd, ageGroupId]);
  } else {
    const [res]: any = await db.query(`INSERT INTO age_groups (name, dob_start, dob_end) VALUES (?, ?, ?)`, [ageGroupName, dobStart, dobEnd]);
    ageGroupId = res.insertId;
  }

  // 2. Link to season via season_age_groups
  await db.query(`INSERT INTO season_age_groups (season_id, age_group_id, gender) VALUES (?, ?, ?)`, [parseInt(seasonId), ageGroupId, gender]);

  revalidatePath("/admin/teams");
}

export async function joinSeason(formData: FormData) {
  const clubId = await getActiveClubId();
  if (!clubId) throw new Error("No active club");
  
  const seasonId = formData.get("seasonId") as string;
  if (!seasonId) throw new Error("Missing seasonId");

  await db.query(`INSERT IGNORE INTO club_seasons (club_id, season_id) VALUES (?, ?)`, [clubId, parseInt(seasonId)]);
  revalidatePath("/admin/teams");
}

export async function createTeam(formData: FormData) {
  const clubId = await getActiveClubId();
  if (!clubId) throw new Error("No active club");

  const name = formData.get("name") as string;
  const season_age_group_id = formData.get("season_age_group_id") as string;

  if (!name || !season_age_group_id) throw new Error("Missing fields");

  await db.query(`INSERT INTO teams (name, season_age_group_id, club_id) VALUES (?, ?, ?)`, [name, parseInt(season_age_group_id), clubId]);
  
  revalidatePath("/admin/teams");
}

export async function assignCoach(formData: FormData) {
  const userId = formData.get("userId") as string;
  const teamId = formData.get("teamId") as string; // can be empty to unassign

  const targetTeamId = teamId ? parseInt(teamId) : null;

  await db.query(`UPDATE users SET assigned_team_id = ? WHERE id = ?`, [targetTeamId, parseInt(userId)]);
  
  revalidatePath("/admin/teams");
  revalidatePath("/admin/users");
}
