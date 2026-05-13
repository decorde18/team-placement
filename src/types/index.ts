export type PlayerStatus = 'invited' | 'declined' | 'accepted' | 'waiting to send invitation' | 'none';
export type PlayerAttendance = 'present' | 'absent' | 'excused';

export type SortOption = 'manual' | 'name' | 'rating' | 'position' | 'status' | 'manual_rank';
export type FilterOption = 'all' | 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'coach';
  assignedTeamId?: string;
}

export interface Season {
  id: string;
  name: string;
}

export interface Division {
  id: string;
  seasonId: string;
  name: string;
}

export interface FieldConfig {
  id: string;
  divisionId: string;
  name: string;
  sortBy: SortOption;
  sortDirection: 'asc' | 'desc';
  filterBy: FilterOption;
  ratingFilter?: string;
}

export type TeamConfig = FieldConfig;

export interface Team extends FieldConfig {}

export interface GlobalPlayer {
  id: string;
  divisionId: string;
  name: string;
  tryoutNumber: string;
  position: string;
  rating: number;
  status: PlayerStatus;
  teamId?: string; // Seasonal team assignment
}

export interface CoachNote {
  id: string;
  coachId: string;
  eventId: string;
  sessionId?: string;
  text: string;
  timestamp: number;
  playerId: string;
}

export interface EventPlayer {
  id: string;
  attendance: PlayerAttendance;
  notes: CoachNote[];
  fieldId: string;
  rank?: number;
}

export type Player = GlobalPlayer & Omit<EventPlayer, 'notes'> & { notes: CoachNote[] };

export interface Session {
  id: string;
  eventId: string;
  name: string;
  date: string;
  fields: FieldConfig[];
  sessionPlayers: EventPlayer[];
}

export interface AppEvent {
  id: string;
  seasonId: string;
  name: string;
  type: 'tryout' | 'ranking';
  divisionIds: string[];
  rankingTeams?: FieldConfig[];
  rankingPlayers?: EventPlayer[];
}

export interface AppData {
  users: User[];
  seasons: Season[];
  divisions: Division[];
  globalPlayers: GlobalPlayer[];
  events: AppEvent[];
  sessions: Session[];
  teams: Team[];
}

export const getHydratedPlayers = (globalPlayers: GlobalPlayer[], eventPlayers: EventPlayer[]): Player[] => {
  return eventPlayers
    .map(ep => {
      const gp = globalPlayers.find(g => g.id === ep.id);
      if (!gp) return null;
      return {
        ...gp,
        ...ep
      };
    })
    .filter((p): p is Player => p !== null);
};
