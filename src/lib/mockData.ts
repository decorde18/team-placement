export type PlayerStatus = 'invited' | 'declined' | 'accepted' | 'waiting to send invitation' | 'none';
export type PlayerAttendance = 'present' | 'absent' | 'excused';

export type SortOption = 'manual' | 'name' | 'rating' | 'position' | 'status';
export type FilterOption = 'all' | 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'coach';
  assignedTeamId?: string; // Specific team they are allowed to manage (if coach)
}

export interface Season {
  id: string;
  name: string; // e.g. "Fall 2026", "Spring 2027"
}

export interface Division {
  id: string;
  seasonId: string;
  name: string; // e.g., "2012 Boys", "U14 Girls"
}

export interface TeamConfig {
  id: string;
  divisionId: string; // strict isolation to age group
  name: string;
  sortBy: SortOption;
  filterBy: FilterOption;
}

export interface GlobalPlayer {
  id: string;
  divisionId: string;
  name: string;
  tryoutNumber: string;
  position: string;
  rating: number; // 1-100
}

export interface CoachNote {
  id: string;
  coachId: string;
  eventId: string;
  sessionId?: string; // Add sessionId for tryout sessions
  text: string;
  timestamp: number;
}

export interface EventPlayer {
  id: string; // references GlobalPlayer
  status: PlayerStatus;
  attendance: PlayerAttendance;
  notes: CoachNote[];
  teamId: string;
}

export type Player = GlobalPlayer & Omit<EventPlayer, 'notes'> & { notes: CoachNote[] };

export interface Session {
  id: string;
  eventId: string;
  name: string; // e.g., "Day 1 Tryouts"
  date: string;
  teams: TeamConfig[];
  sessionPlayers: EventPlayer[];
}

export interface AppEvent {
  id: string;
  seasonId: string;
  name: string;
  type: 'tryout' | 'ranking';
  divisionIds: string[]; // age groups involved
  // Only for ranking events
  rankingTeams?: TeamConfig[];
  rankingPlayers?: EventPlayer[];
}

export interface AppData {
  users: User[];
  seasons: Season[];
  divisions: Division[];
  globalPlayers: GlobalPlayer[];
  events: AppEvent[];
  sessions: Session[];
}

// Data Generation
const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Frank', 'Patrick', 'Raymond', 'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Henry', 'Douglas', 'Zachary', 'Peter', 'Kyle', 'Ethan', 'Walter', 'Noah', 'Jeremy', 'Christian', 'Keith', 'Roger', 'Terry', 'Gerald', 'Harold', 'Sean', 'Austin', 'Carl', 'Arthur', 'Lawrence', 'Dylan'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes'];
const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

export const generateInitialData = (): AppData => {
  const users: User[] = [
    { id: 'admin-1', name: 'Director (Admin)', role: 'admin' },
    { id: 'coach-1', name: 'Coach Smith (Team 1)', role: 'coach', assignedTeamId: 'team-1' },
    { id: 'coach-2', name: 'Coach Johnson (Team 2)', role: 'coach', assignedTeamId: 'team-2' }
  ];

  const seasons: Season[] = [
    { id: 'season-1', name: 'Fall 2026' }
  ];

  const divisions: Division[] = [
    { id: 'div-2012B', seasonId: 'season-1', name: '2012 Boys' },
    { id: 'div-2012G', seasonId: 'season-1', name: '2012 Girls' }
  ];

  const globalPlayers: GlobalPlayer[] = [];
  const sessionPlayers: EventPlayer[] = [];
  const rankingPlayers: EventPlayer[] = [];
  
  // Generate 75 players for 2012 Boys
  for (let i = 1; i <= 75; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const id = `player-${i}`;
    
    globalPlayers.push({
      id,
      divisionId: 'div-2012B',
      name: `${firstName} ${lastName}`,
      tryoutNumber: `${100 + i}`,
      position: positions[Math.floor(Math.random() * positions.length)],
      rating: Math.floor(Math.random() * 60) + 40,
    });

    sessionPlayers.push({
      id,
      status: 'none',
      attendance: 'present',
      notes: [],
      teamId: 'unassigned'
    });

    rankingPlayers.push({
      id,
      status: 'none',
      attendance: 'present',
      notes: [],
      // Let's divide them into 3 teams for the ranking event snapshot
      teamId: i <= 25 ? 'team-1' : (i <= 50 ? 'team-2' : 'team-3')
    });
  }

  const initialTeams: TeamConfig[] = [
    { id: 'unassigned', divisionId: 'div-2012B', name: 'Unassigned Pool', sortBy: 'rating', filterBy: 'all' },
    { id: 'team-1', divisionId: 'div-2012B', name: 'Team 1', sortBy: 'name', filterBy: 'all' },
    { id: 'team-2', divisionId: 'div-2012B', name: 'Team 2', sortBy: 'name', filterBy: 'all' },
    { id: 'team-3', divisionId: 'div-2012B', name: 'Team 3', sortBy: 'name', filterBy: 'all' },
  ];

  const tryoutEvent: AppEvent = {
    id: 'event-1',
    seasonId: 'season-1',
    name: 'Fall 2026 Tryouts',
    type: 'tryout',
    divisionIds: ['div-2012B', 'div-2012G']
  };

  const day1Session: Session = {
    id: 'session-1',
    eventId: 'event-1',
    name: 'Day 1 Tryouts',
    date: new Date().toISOString().split('T')[0],
    teams: initialTeams,
    sessionPlayers: sessionPlayers
  };

  const rankingEvent: AppEvent = {
    id: 'event-2',
    seasonId: 'season-1',
    name: 'Mid-Season Player Rankings',
    type: 'ranking',
    divisionIds: ['div-2012B'],
    rankingTeams: initialTeams.filter(t => t.id !== 'unassigned'),
    rankingPlayers: rankingPlayers
  };

  return {
    users,
    seasons,
    divisions,
    globalPlayers,
    events: [tryoutEvent, rankingEvent],
    sessions: [day1Session]
  };
};

const STORAGE_KEY = 'player_movement_app_data_v2'; // Bumped version to force reset

export const loadAppData = (): AppData => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse app data", e);
      }
    }
  }
  const newData = generateInitialData();
  saveAppData(newData);
  return newData;
};

export const saveAppData = (data: AppData) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

export const getHydratedPlayers = (globalPlayers: GlobalPlayer[], eventPlayers: EventPlayer[]): Player[] => {
  return eventPlayers.map(ep => {
    const gp = globalPlayers.find(g => g.id === ep.id);
    return {
      ...gp!,
      ...ep
    };
  });
};
