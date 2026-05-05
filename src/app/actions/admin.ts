"use server";

import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// Users
export async function getUsers() {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.assigned_team_id, t.name as team_name 
     FROM users u 
     LEFT JOIN teams t ON u.assigned_team_id = t.id
     ORDER BY u.created_at DESC`
  );
  return rows as any[];
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    throw new Error("All fields are required");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)`,
    [name, email, role, hashedPassword]
  );

  // We must revalidate Next.js cache so the UI updates
  // Assuming Next.js 14, import revalidatePath from "next/cache"
  revalidatePath("/admin/users");
}

// Seasons & Hierarchy
export async function getSeasonsHierarchy() {
  // We want to fetch seasons, their age groups, and their teams
  // We'll do a few queries and assemble them for the UI
  const [seasons]: any = await db.query(`SELECT * FROM seasons ORDER BY start_date DESC`);
  const [divisions]: any = await db.query(`
    SELECT sag.id, sag.season_id, sag.gender, ag.name as age_group_name
    FROM season_age_groups sag
    JOIN age_groups ag ON sag.age_group_id = ag.id
  `);
  const [teams]: any = await db.query(`SELECT * FROM teams`);

  return { seasons, divisions, teams };
}

export async function createTeam(formData: FormData) {
  const name = formData.get("name") as string;
  const season_age_group_id = formData.get("season_age_group_id") as string;

  if (!name || !season_age_group_id) throw new Error("Missing fields");

  await db.query(`INSERT INTO teams (name, season_age_group_id) VALUES (?, ?)`, [name, parseInt(season_age_group_id)]);
  
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
