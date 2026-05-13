"use server";

import db from "@/lib/db";
import { AppData, User, Season, Division, GlobalPlayer, AppEvent, Session, TeamConfig, EventPlayer, CoachNote } from "@/lib/mockData";

import { getActiveClubId } from "./clubs";

export async function fetchAppData(): Promise<AppData> {
  const clubId = await getActiveClubId();
  if (!clubId) throw new Error("No active club context found");

  const connection = await db.getConnection();
  
  try {
    const [dbUsers]: any = await connection.query(`SELECT id, name, role, assigned_team_id FROM users WHERE club_id = ? OR role = 'system_admin'`, [clubId]);
    const users: User[] = dbUsers.map((u: any) => ({
      id: String(u.id),
      name: u.name,
      role: u.role,
      assignedTeamId: u.assigned_team_id ? String(u.assigned_team_id) : undefined
    }));

    const [dbSeasons]: any = await connection.query(`
      SELECT s.id, s.name 
      FROM seasons s
      JOIN club_seasons cs ON s.id = cs.season_id
      WHERE cs.club_id = ?
    `, [clubId]);
    const seasons: Season[] = dbSeasons.map((s: any) => ({ id: String(s.id), name: s.name }));

    const [dbDivisions]: any = await connection.query(`
      SELECT sag.id, sag.season_id, ag.name, sag.gender 
      FROM season_age_groups sag 
      JOIN age_groups ag ON sag.age_group_id = ag.id
      JOIN club_seasons cs ON sag.season_id = cs.season_id
      WHERE cs.club_id = ?
    `, [clubId]);
    const divisions: Division[] = dbDivisions.map((d: any) => ({
      id: String(d.id),
      seasonId: String(d.season_id),
      name: `${d.name} ${d.gender === 'M' ? 'Boys' : d.gender === 'F' ? 'Girls' : ''}`.trim()
    }));

    const [dbGlobalPlayers]: any = await connection.query(`
      SELECT p.id, sp.season_age_group_id, p.first_name, p.last_name, sp.tryout_number, sp.position, sp.rating 
      FROM players p 
      JOIN season_players sp ON p.id = sp.player_id
      WHERE p.club_id = ?
    `, [clubId]);
    const globalPlayers: GlobalPlayer[] = dbGlobalPlayers.map((gp: any) => ({
      id: String(gp.id),
      divisionId: String(gp.season_age_group_id),
      name: `${gp.first_name} ${gp.last_name}`,
      tryoutNumber: gp.tryout_number || '',
      position: gp.position || '',
      rating: gp.rating || 0
    }));

    const [dbEvents]: any = await connection.query(`
      SELECT e.id, e.season_id, e.name, e.event_type 
      FROM events e
      JOIN club_seasons cs ON e.season_id = cs.season_id
      WHERE cs.club_id = ?
    `, [clubId]);
    const [dbEventDivisions]: any = await connection.query(`
      SELECT ed.event_id, ed.season_age_group_id 
      FROM event_divisions ed
      JOIN events e ON ed.event_id = e.id
      JOIN club_seasons cs ON e.season_id = cs.season_id
      WHERE cs.club_id = ?
    `, [clubId]);
    
    const events: AppEvent[] = dbEvents.map((e: any) => {
      const divIds = dbEventDivisions.filter((ed: any) => ed.event_id === e.id).map((ed: any) => String(ed.season_age_group_id));
      return {
        id: String(e.id),
        seasonId: String(e.season_id),
        name: e.name,
        type: e.event_type as 'tryout' | 'ranking',
        divisionIds: divIds
      };
    });

    const [dbTeams]: any = await connection.query(`SELECT id, season_age_group_id, name, sort_by, filter_by FROM teams WHERE club_id = ?`, [clubId]);
    const teamsList: TeamConfig[] = dbTeams.map((t: any) => ({
      id: String(t.id),
      divisionId: String(t.season_age_group_id),
      name: t.name,
      sortBy: t.sort_by as any,
      filterBy: t.filter_by as any
    }));

    const [dbCoachNotes]: any = await connection.query(`
      SELECT cn.id, cn.coach_id, cn.session_id, cn.event_id, cn.player_id, cn.note_text, UNIX_TIMESTAMP(cn.created_at) * 1000 as ts 
      FROM coach_notes cn
      JOIN players p ON cn.player_id = p.id
      WHERE p.club_id = ?
    `, [clubId]);
    const coachNotes = dbCoachNotes.map((cn: any) => ({
      id: String(cn.id),
      coachId: String(cn.coach_id),
      eventId: String(cn.event_id),
      sessionId: cn.session_id ? String(cn.session_id) : undefined,
      playerId: String(cn.player_id),
      text: cn.note_text,
      timestamp: cn.ts
    }));

    const [dbSessions]: any = await connection.query(`
      SELECT s.id, s.event_id, s.name, s.session_date 
      FROM sessions s
      JOIN events e ON s.event_id = e.id
      JOIN club_seasons cs ON e.season_id = cs.season_id
      WHERE cs.club_id = ?
    `, [clubId]);
    const [dbSessionPlayers]: any = await connection.query(`
      SELECT sp.id, sp.session_id, sp.player_id, sp.team_id, sp.attendance_status, sp.player_status 
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE p.club_id = ?
    `, [clubId]);

    const sessions: Session[] = dbSessions.map((s: any) => {
      const sessionIdStr = String(s.id);
      const sPlayers = dbSessionPlayers.filter((sp: any) => String(sp.session_id) === sessionIdStr);
      
      const sessionPlayers: EventPlayer[] = sPlayers.map((sp: any) => {
        const playerIdStr = String(sp.player_id);
        const playerNotes = coachNotes.filter((cn: any) => cn.playerId === playerIdStr && cn.sessionId === sessionIdStr).map((cn: any) => ({
          id: cn.id,
          coachId: cn.coachId,
          eventId: cn.eventId,
          sessionId: cn.sessionId,
          text: cn.text,
          timestamp: cn.timestamp
        } as CoachNote));

        return {
          id: playerIdStr,
          status: sp.player_status as any,
          attendance: sp.attendance_status as any,
          notes: playerNotes,
          teamId: sp.team_id ? String(sp.team_id) : 'unassigned'
        };
      });

      const event = events.find(e => e.id === String(s.event_id));
      let sessionTeams = teamsList;
      if (event) {
         sessionTeams = teamsList.filter(t => event.divisionIds.includes(t.divisionId));
      }

      return {
        id: sessionIdStr,
        eventId: String(s.event_id),
        name: s.name,
        date: s.session_date ? s.session_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        teams: sessionTeams,
        sessionPlayers: sessionPlayers
      };
    });

    return {
      users,
      seasons,
      divisions,
      globalPlayers,
      events,
      sessions
    };
  } finally {
    connection.release();
  }
}

// Full Sync is complex because we have to determine what changed.
// Given PlayerBoard saves the ENTIRE AppData state, we will do a targeted sync.
// We primarily care about: 
// 1. Session Players (team_id, player_status, attendance_status)
// 2. Teams (name, sort_by, filter_by)
// 3. New Coach Notes (we'll just insert any note that doesn't exist or is a generic ID)
// 4. New Sessions created on the fly
export async function syncAppData(appData: AppData) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Sync Teams
    // Since AppData has teams inside sessions, we flatten them.
    // In DB, teams are global. We'll update by ID. If id starts with 'team-', we assume it's new.
    // But since mockData also has 'team-1', it's tricky.
    // For now, let's just update existing numeric IDs, and insert new ones.
    const allTeams = new Map<string, TeamConfig>();
    appData.sessions.forEach(s => {
        s.teams.forEach(t => allTeams.set(t.id, t));
    });

    for (const [id, t] of allTeams.entries()) {
        if (!id.includes('unassigned')) {
             if (id.startsWith('team-')) {
                 // It's a new team created in UI
                 const [res]: any = await connection.query(
                     `INSERT INTO teams (season_age_group_id, name, sort_by, filter_by) VALUES (?, ?, ?, ?)`,
                     [parseInt(t.divisionId), t.name, t.sortBy, t.filterBy]
                 );
                 // We'd need to map the new ID back to the session_players... 
                 // This is a complex mapping problem if we don't return the new IDs to the client.
                 // For a robust sync, the client should call specific actions (e.g. createTeam) rather than massive sync.
                 // However, we will do our best here.
             } else {
                 // Existing numeric ID
                 await connection.query(
                     `UPDATE teams SET name = ?, sort_by = ?, filter_by = ? WHERE id = ?`,
                     [t.name, t.sortBy, t.filterBy, parseInt(id)]
                 );
             }
        }
    }

    // 2. Sync Session Players
    for (const s of appData.sessions) {
        // If session ID is numeric, it exists. If it starts with 'session-', it's new.
        let sessionId = parseInt(s.id);
        if (isNaN(sessionId) && s.id.startsWith('session-')) {
            const [res]: any = await connection.query(
                `INSERT INTO sessions (event_id, name, session_date) VALUES (?, ?, ?)`,
                [parseInt(s.eventId), s.name, s.date]
            );
            sessionId = res.insertId;
        }

        for (const sp of s.sessionPlayers) {
            let teamId = sp.teamId.includes('unassigned') ? null : parseInt(sp.teamId);
            if (isNaN(teamId as number)) teamId = null; // Fallback if team is new and we couldn't map it.

            // Upsert session_player
            const [existing]: any = await connection.query(
                `SELECT id FROM session_players WHERE session_id = ? AND player_id = ?`,
                [sessionId, parseInt(sp.id)]
            );

            if (existing.length > 0) {
                await connection.query(
                    `UPDATE session_players SET team_id = ?, attendance_status = ?, player_status = ? WHERE id = ?`,
                    [teamId, sp.attendance, sp.status, existing[0].id]
                );
            } else {
                await connection.query(
                    `INSERT INTO session_players (session_id, player_id, team_id, attendance_status, player_status) VALUES (?, ?, ?, ?, ?)`,
                    [sessionId, parseInt(sp.id), teamId, sp.attendance, sp.status]
                );
            }

            // Sync notes
            for (const note of sp.notes) {
                if (note.id.startsWith('note-')) {
                    // New note
                    await connection.query(
                        `INSERT INTO coach_notes (coach_id, session_id, event_id, player_id, note_text) VALUES (?, ?, ?, ?, ?)`,
                        [parseInt(note.coachId), sessionId, parseInt(note.eventId), parseInt(sp.id), note.text]
                    );
                }
            }
        }
    }

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error("Sync error:", error);
    throw error;
  } finally {
    connection.release();
  }
}
