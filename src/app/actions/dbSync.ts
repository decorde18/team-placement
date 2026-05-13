"use server";

import db from "@/lib/db";
import { AppData, User, Season, Division, GlobalPlayer, AppEvent, Session, FieldConfig, EventPlayer, CoachNote, Team } from "@/types";

import { getActiveClubId } from "./clubs";
import { syncEventPlayers } from "./events";

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
      SELECT p.id, sp.season_age_group_id, p.first_name, p.last_name, sp.tryout_number, sp.position, sp.rating, sp.player_status 
      FROM players p 
      JOIN season_players sp ON p.id = sp.player_id
      WHERE p.club_id = ?
    `, [clubId]);
    const globalPlayers: GlobalPlayer[] = dbGlobalPlayers.map((gp: any) => ({
      id: String(gp.id),
      divisionId: String(gp.season_age_group_id),
      name: `${gp.last_name}, ${gp.first_name}`,
      tryoutNumber: gp.tryout_number || '',
      position: gp.position || '',
      rating: gp.rating || 0,
      status: (gp.player_status || 'none') as any
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

    const [dbSessionFields]: any = await connection.query(`
      SELECT sf.id, sf.session_id, sf.name, sf.sort_by, sf.sort_direction, sf.filter_by
      FROM session_fields sf
      JOIN sessions s ON sf.session_id = s.id
      JOIN events e ON s.event_id = e.id
      JOIN club_seasons cs ON e.season_id = cs.season_id
      WHERE cs.club_id = ?
    `, [clubId]);

    const [dbSessionPlayers]: any = await connection.query(`
      SELECT 
        sp.id, sp.session_id, sp.player_id, sp.field_id, 
        sp.attendance_status, sp.rank,
        (SELECT season_age_group_id FROM season_players WHERE player_id = sp.player_id LIMIT 1) as division_id
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE p.club_id = ?
    `, [clubId]);

    const sessions: Session[] = dbSessions.map((s: any) => {
      const sessionIdStr = String(s.id);
      const sPlayers = dbSessionPlayers.filter((sp: any) => String(sp.session_id) === sessionIdStr);
      const sFields = dbSessionFields.filter((sf: any) => String(sf.session_id) === sessionIdStr);
      
      const event = events.find(e => e.id === String(s.event_id));
      
      const virtualUnassignedFields: FieldConfig[] = event ? event.divisionIds.map(divId => ({
        id: `unassigned-${divId}-${sessionIdStr}`,
        divisionId: divId,
        name: 'Unassigned Pool',
        sortBy: 'rating',
        sortDirection: 'desc',
        filterBy: 'all',
        ratingFilter: 'all'
      })) : [];

      const sessionPlayers: EventPlayer[] = sPlayers.map((sp: any) => {
        const playerIdStr = String(sp.player_id);
        const divId = sp.division_id ? String(sp.division_id) : (event?.divisionIds[0] || '');
        return {
          id: playerIdStr,
          attendance: (sp.attendance_status || 'present') as any,
          notes: coachNotes.filter((cn: any) => cn.playerId === playerIdStr && cn.sessionId === sessionIdStr),
          fieldId: sp.field_id ? String(sp.field_id) : `unassigned-${divId}-${sessionIdStr}`,
          rank: sp.rank || 0
        };
      });

      const fields: FieldConfig[] = [
        ...virtualUnassignedFields,
        ...sFields.map((sf: any) => ({
          id: String(sf.id),
          divisionId: String(dbSessionPlayers.find((sp: any) => String(sp.field_id) === String(sf.id))?.division_id || event?.divisionIds[0] || ''),
          name: sf.name,
          sortBy: (sf.sort_by || 'name') as any,
          sortDirection: (sf.sort_direction || 'asc') as any,
          filterBy: (sf.filter_by || 'all') as any,
          ratingFilter: (sf.rating_filter || 'all') as any
        }))
      ];

      return {
        id: sessionIdStr,
        eventId: String(s.event_id),
        name: s.name,
        date: s.session_date ? (s.session_date instanceof Date ? s.session_date.toISOString().split('T')[0] : String(s.session_date)) : new Date().toISOString().split('T')[0],
        fields: fields,
        sessionPlayers: sessionPlayers
      };
    });

    return {
      users,
      seasons,
      divisions,
      globalPlayers,
      events,
      sessions,
      teams: teamsList.map(t => ({ id: t.id, divisionId: t.divisionId, name: t.name }))
    };
  } finally {
    connection.release();
  }
}

export async function syncAppData(appData: AppData) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const idMappings: { [key: string]: string } = {};

    // PASS 1: Sync all Session Fields across all sessions to build mappings
    for (const s of appData.sessions) {
        let sessionId = parseInt(s.id);
        // Ensure session exists
        if (isNaN(sessionId) && s.id.startsWith('session-')) {
            const [res]: any = await connection.query(
                `INSERT INTO sessions (event_id, name, session_date) VALUES (?, ?, ?)`,
                [parseInt(s.eventId), s.name, s.date]
            );
            sessionId = res.insertId;
            idMappings[s.id] = String(sessionId);
            await syncEventPlayers(parseInt(s.eventId), connection);
        }

        // Cleanup fields
        const currentFieldIds = s.fields.filter(f => !f.id.includes('unassigned') && !f.id.startsWith('field-') && !f.id.startsWith('team-')).map(f => parseInt(f.id));
        if (currentFieldIds.length > 0) {
            await connection.query(`DELETE FROM session_fields WHERE session_id = ? AND id NOT IN (?)`, [sessionId, currentFieldIds]);
        } else {
            await connection.query(`DELETE FROM session_fields WHERE session_id = ?`, [sessionId]);
        }

        // Create/Update fields and store mappings
        for (const f of s.fields) {
            if (!f.id.includes('unassigned')) {
                if (f.id.startsWith('field-') || f.id.startsWith('team-')) {
                    const [res]: any = await connection.query(
                        `INSERT INTO session_fields (session_id, name) VALUES (?, ?)`,
                        [sessionId, f.name]
                    );
                    idMappings[f.id] = String(res.insertId);
                } else {
                    await connection.query(
                        `UPDATE session_fields SET name = ? WHERE id = ?`,
                        [f.name, parseInt(f.id)]
                    );
                }
            }
        }
    }

    // PASS 2: Sync all Players (now that ALL fields are guaranteed to exist in the DB)
    for (const s of appData.sessions) {
        const sessionId = idMappings[s.id] ? parseInt(idMappings[s.id]) : parseInt(s.id);
        if (isNaN(sessionId)) continue;

        const [existingSessionPlayers]: any = await connection.query(
            `SELECT id, player_id FROM session_players WHERE session_id = ?`,
            [sessionId]
        );
        const sessionPlayerMap = new Map(existingSessionPlayers.map((p: any) => [String(p.player_id), p.id]));

        for (const sp of s.sessionPlayers) {
            let fieldIdRaw = sp.fieldId;
            if (idMappings[fieldIdRaw]) fieldIdRaw = idMappings[fieldIdRaw];
            
            let fieldId = (fieldIdRaw.includes('unassigned') || fieldIdRaw.startsWith('field-') || fieldIdRaw.startsWith('team-')) 
                ? null 
                : parseInt(fieldIdRaw);
            
            if (isNaN(fieldId as number)) fieldId = null;

            const existingId = sessionPlayerMap.get(String(sp.id));

            if (existingId) {
                await connection.query(
                    `UPDATE session_players SET field_id = ?, attendance_status = ?, rank = ? WHERE id = ?`,
                    [fieldId, sp.attendance, sp.rank || 0, existingId]
                );
            } else {
                await connection.query(
                    `INSERT IGNORE INTO session_players (session_id, player_id, field_id, attendance_status, rank) VALUES (?, ?, ?, ?, ?)`,
                    [sessionId, parseInt(sp.id), fieldId, sp.attendance, sp.rank || 0]
                );
            }

            // Sync status to season_players (Selection Status)
            const globalPlayer = appData.globalPlayers.find(gp => gp.id === sp.id);
            if (globalPlayer) {
              await connection.query(
                `UPDATE season_players SET player_status = ? WHERE player_id = ?`,
                [globalPlayer.status, parseInt(sp.id)]
              );
            }

            for (const note of sp.notes) {
                if (note.id.startsWith('note-')) {
                    await connection.query(
                        `INSERT INTO coach_notes (coach_id, session_id, event_id, player_id, note_text) VALUES (?, ?, ?, ?, ?)`,
                        [parseInt(note.coachId), sessionId, parseInt(note.eventId), parseInt(sp.id), note.text]
                    );
                }
            }
        }
    }

    await connection.commit();
    return { success: true, idMappings };
  } catch (error) {
    await connection.rollback();
    console.error("Sync error:", error);
    throw error;
  } finally {
    connection.release();
  }
}
