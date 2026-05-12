"use server";

import db from "@/lib/db";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

export async function getActiveClubId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as any;
  if (user.role === "system_admin") {
    const cookieStore = await cookies();
    const activeClubId = cookieStore.get("activeClubId")?.value;
    if (activeClubId) return parseInt(activeClubId);
  }

  return user.club_id;
}

export async function setActiveClub(clubId: string) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role === "system_admin") {
    const cookieStore = await cookies();
    cookieStore.set("activeClubId", clubId, { path: '/' });
    revalidatePath("/", "layout");
  }
}

export async function getClubs() {
  const [rows] = await db.query(`SELECT id, name FROM clubs ORDER BY name ASC`);
  return rows as { id: number; name: string }[];
}

export async function createClub(formData: FormData) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "system_admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name) throw new Error("Club name is required");

  await db.query(`INSERT INTO clubs (name) VALUES (?)`, [name]);
  revalidatePath("/admin/clubs");
}
