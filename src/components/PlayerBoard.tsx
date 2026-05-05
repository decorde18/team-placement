"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  PointerSensor, 
  useSensor, 
  useSensors, 
  closestCorners,
  DragOverlay
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { 
  AppData, 
  AppEvent,
  Session, 
  EventPlayer,
  Player, 
  PlayerStatus, 
  TeamConfig, 
  SortOption, 
  FilterOption,
  loadAppData,
  saveAppData,
  getHydratedPlayers,
  CoachNote,
  PlayerAttendance
} from '@/lib/mockData';
import { TeamSection } from './TeamSection';
import { PlayerCard } from './PlayerCard';
import { LayoutGrid, List, Settings2, Users as UsersIcon, Plus, Calendar, Shield, Map, Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to sort and filter players
const getProcessedPlayers = (players: Player[], team: TeamConfig) => {
  let teamPlayers = players.filter(p => p.teamId === team.id);
  
  if (team.filterBy !== 'all') {
    teamPlayers = teamPlayers.filter(p => p.position === team.filterBy);
  }

  if (team.sortBy === 'name') {
    teamPlayers.sort((a, b) => a.name.localeCompare(b.name));
  } else if (team.sortBy === 'rating') {
    teamPlayers.sort((a, b) => b.rating - a.rating); // descending
  } else if (team.sortBy === 'position') {
    teamPlayers.sort((a, b) => a.position.localeCompare(b.position));
  } else if (team.sortBy === 'status') {
    const statusOrder: Record<string, number> = {
      'accepted': 1,
      'invited': 2,
      'waiting to send invitation': 3,
      'none': 4,
      'declined': 5
    };
    teamPlayers.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
  }

  // Force declined players to the bottom
  teamPlayers.sort((a, b) => {
    if (a.status === 'declined' && b.status !== 'declined') return 1;
    if (a.status !== 'declined' && b.status === 'declined') return -1;
    return 0;
  });

  return teamPlayers;
};

export function PlayerBoard() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeDivisionId, setActiveDivisionId] = useState<string>('');
  const [activeUserId, setActiveUserId] = useState<string>('');
  
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [isTryoutMode, setIsTryoutMode] = useState(false);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [selectedPlayerForDetails, setSelectedPlayerForDetails] = useState<Player | null>(null);

  // Modals State
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [cloneSessionId, setCloneSessionId] = useState<string>('none');

  useEffect(() => {
    const data = loadAppData();
    setAppData(data);
    
    // Set initial defaults
    const initialSeason = data.seasons[0]?.id || '';
    setActiveSeasonId(initialSeason);
    
    const initialEvents = data.events.filter(e => e.seasonId === initialSeason && e.type === 'tryout');
    const initialEvent = initialEvents[0]?.id || '';
    setActiveEventId(initialEvent);

    const initialSessions = data.sessions.filter(s => s.eventId === initialEvent);
    const initialSession = initialSessions[0]?.id || '';
    setActiveSessionId(initialSession);

    const ev = initialEvents[0];
    if (ev && ev.divisionIds.length > 0) {
      setActiveDivisionId(ev.divisionIds[0]);
    } else {
      setActiveDivisionId(data.divisions[0]?.id || '');
    }

    setActiveUserId(data.users[0]?.id || '');
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (appData && isMounted) {
      saveAppData(appData);
    }
  }, [appData, isMounted]);

  const activeUser = useMemo(() => appData?.users.find(u => u.id === activeUserId), [appData, activeUserId]);
  
  // Cascading derivations
  const seasonEvents = useMemo(() => appData?.events.filter(e => e.seasonId === activeSeasonId && e.type === 'tryout') || [], [appData, activeSeasonId]);
  const activeEvent = useMemo(() => seasonEvents.find(e => e.id === activeEventId), [seasonEvents, activeEventId]);
  
  const eventSessions = useMemo(() => appData?.sessions.filter(s => s.eventId === activeEventId) || [], [appData, activeEventId]);
  const activeSession = useMemo(() => eventSessions.find(s => s.id === activeSessionId), [eventSessions, activeSessionId]);

  const availableDivisions = useMemo(() => {
    if (!appData || !activeEvent) return [];
    return appData.divisions.filter(d => activeEvent.divisionIds.includes(d.id));
  }, [appData, activeEvent]);

  // Handle cascading default updates when parents change
  useEffect(() => {
    if (isMounted && activeSeasonId && appData) {
      const events = appData.events.filter(e => e.seasonId === activeSeasonId && e.type === 'tryout');
      if (!events.some(e => e.id === activeEventId)) {
        setActiveEventId(events[0]?.id || '');
      }
    }
  }, [activeSeasonId, isMounted, appData, activeEventId]);

  useEffect(() => {
    if (isMounted && activeEventId && appData) {
      const sessions = appData.sessions.filter(s => s.eventId === activeEventId);
      if (!sessions.some(s => s.id === activeSessionId)) {
        setActiveSessionId(sessions[0]?.id || '');
      }
      const event = appData.events.find(e => e.id === activeEventId);
      if (event && !event.divisionIds.includes(activeDivisionId)) {
        setActiveDivisionId(event.divisionIds[0] || '');
      }
    }
  }, [activeEventId, isMounted, appData, activeSessionId, activeDivisionId]);

  const hydratedPlayers = useMemo(() => {
    if (!appData || !activeSession || !activeDivisionId) return [];
    const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === activeDivisionId);
    return getHydratedPlayers(divPlayers, activeSession.sessionPlayers);
  }, [appData, activeSession, activeDivisionId]);

  // Only show teams for the active division
  const activeDivisionTeams = useMemo(() => {
    if (!activeSession || !activeDivisionId) return [];
    return activeSession.teams.filter(t => t.divisionId === activeDivisionId);
  }, [activeSession, activeDivisionId]);

  const updateSessionPlayers = (updater: (prev: EventPlayer[]) => EventPlayer[]) => {
    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === activeSessionId ? {
          ...s,
          sessionPlayers: updater(s.sessionPlayers)
        } : s)
      };
    });
  };

  const updateTeams = (updater: (prev: TeamConfig[]) => TeamConfig[]) => {
    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === activeSessionId ? {
          ...s,
          teams: updater(s.teams)
        } : s)
      };
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const player = hydratedPlayers.find(p => p.id === active.id);
    if (player) setActivePlayer(player);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayer(null);

    if (!over || !activeSession || !activeUser) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activePlayer = hydratedPlayers.find(p => p.id === activeId);
    if (!activePlayer) return;

    const overPlayer = hydratedPlayers.find(p => p.id === overId);
    const overTeamId = overPlayer ? overPlayer.teamId : overId;
    const overTeam = activeDivisionTeams.find(t => t.id === overTeamId);

    if (!overTeam) return;

    // Authorization Check for Coaches
    if (activeUser.role === 'coach') {
      if (activePlayer.teamId !== activeUser.assignedTeamId && overTeamId !== activeUser.assignedTeamId) {
        alert("You only have permission to move players into or out of your assigned team.");
        return;
      }
    }

    // Auto-clear filter on mismatch
    if (overTeam.filterBy !== 'all' && activePlayer.position !== overTeam.filterBy) {
      updateTeams(prev => prev.map(t => t.id === overTeam.id ? { ...t, filterBy: 'all' } : t));
    }

    if (activePlayer.teamId !== overTeamId) {
      updateSessionPlayers((prev) => {
        const activeIndex = prev.findIndex(p => p.id === activeId);
        const newPlayers = [...prev];
        const [movedPlayer] = newPlayers.splice(activeIndex, 1);
        movedPlayer.teamId = overTeamId;
        
        if (overTeam.sortBy === 'manual' && overPlayer) {
          const overIndexMaster = newPlayers.findIndex(p => p.id === overId);
          const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
          const modifier = isBelowOverItem ? 1 : 0;
          newPlayers.splice(overIndexMaster + modifier, 0, movedPlayer);
        } else {
          newPlayers.push(movedPlayer);
        }
        return newPlayers;
      });
    } else if (activeId !== overId) {
      if (overTeam.sortBy === 'manual') {
        updateSessionPlayers((prev) => {
          const activeIndex = prev.findIndex(p => p.id === activeId);
          const overIndex = prev.findIndex(p => p.id === overId);
          return arrayMove(prev, activeIndex, overIndex);
        });
      }
    }
  };

  const handleStatusChange = (id: string, status: PlayerStatus) => {
    updateSessionPlayers(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };
  
  const handleAttendanceChange = (id: string, attendance: PlayerAttendance) => {
    updateSessionPlayers(prev => prev.map(p => p.id === id ? { ...p, attendance } : p));
  };

  const handleNotesChange = (playerId: string, text: string) => {
    updateSessionPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        const newNote: CoachNote = {
          id: `note-${Date.now()}`,
          coachId: activeUserId,
          eventId: activeEventId,
          sessionId: activeSessionId,
          text,
          timestamp: Date.now()
        };
        return { ...p, notes: [...p.notes, newNote] };
      }
      return p;
    }));
  };
  
  const handleTeamNameChange = (id: string, name: string) => {
    updateTeams(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  };
  const handleSortChange = (id: string, sortBy: SortOption) => {
    updateTeams(prev => prev.map(t => t.id === id ? { ...t, sortBy } : t));
  };
  const handleFilterChange = (id: string, filterBy: FilterOption) => {
    updateTeams(prev => prev.map(t => t.id === id ? { ...t, filterBy } : t));
  };

  const handleAddTeam = () => {
    const newTeamId = `team-${Date.now()}`;
    updateTeams(prev => [...prev, {
      id: newTeamId,
      divisionId: activeDivisionId,
      name: `Team ${prev.filter(t => t.divisionId === activeDivisionId).length}`,
      sortBy: 'name',
      filterBy: 'all'
    }]);
  };

  const handleDeleteTeam = (id: string) => {
    const unassignedTeam = activeDivisionTeams.find(t => t.name.includes('Unassigned') || t.id.includes('unassigned'));
    const unassignedId = unassignedTeam ? unassignedTeam.id : `unassigned-${activeDivisionId}`;
    updateSessionPlayers(prev => prev.map(p => p.teamId === id ? { ...p, teamId: unassignedId } : p));
    updateTeams(prev => prev.filter(t => t.id !== id));
  };

  const handleCreateSession = () => {
    if (!newSessionName.trim() || !appData || !activeEvent) return;
    
    let clonedTeams: TeamConfig[];
    let clonedSessionPlayers: EventPlayer[];

    if (cloneSessionId !== 'none') {
      const sourceSession = appData.sessions.find(s => s.id === cloneSessionId);
      if (sourceSession) {
        clonedTeams = JSON.parse(JSON.stringify(sourceSession.teams));
        clonedSessionPlayers = JSON.parse(JSON.stringify(sourceSession.sessionPlayers));
      } else {
        return;
      }
    } else {
      // Create empty boilerplate for ALL divisions in this event
      clonedTeams = [];
      clonedSessionPlayers = [];
      
      activeEvent.divisionIds.forEach(divId => {
        clonedTeams.push(
          { id: `unassigned-${divId}`, divisionId: divId, name: 'Unassigned Pool', sortBy: 'rating', filterBy: 'all' },
          { id: `team-1-${divId}`, divisionId: divId, name: 'Team 1', sortBy: 'name', filterBy: 'all' }
        );
        
        const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === divId);
        divPlayers.forEach(gp => {
          clonedSessionPlayers.push({
            id: gp.id,
            status: 'none',
            attendance: 'present',
            notes: [],
            teamId: `unassigned-${divId}`
          });
        });
      });
    }

    const newSession: Session = {
      id: `session-${Date.now()}`,
      eventId: activeEventId,
      name: newSessionName.trim(),
      date: new Date().toISOString().split('T')[0],
      teams: clonedTeams,
      sessionPlayers: clonedSessionPlayers
    };

    setAppData(prev => prev ? { ...prev, sessions: [...prev.sessions, newSession] } : null);
    setActiveSessionId(newSession.id);
    setIsCreateSessionModalOpen(false);
    setNewSessionName('');
    setCloneSessionId('none');
  };

  const handleInviteAllTeam = (teamId: string) => {
    updateSessionPlayers(prev => prev.map(p => p.teamId === teamId ? { ...p, status: 'invited' } : p));
  };

  if (!isMounted || !appData || !activeUser) {
    return <div className="min-h-screen bg-gray-50/30 flex items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!activeEvent || !activeSession) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Tryout Events Found</h2>
        <p>Please create a tryout event to begin.</p>
      </div>
    );
  }

  const unassignedTeam = activeDivisionTeams.find(t => t.name.includes('Unassigned') || t.id.includes('unassigned'));
  const assignedTeams = activeDivisionTeams.filter(t => t.id !== unassignedTeam?.id);

  return (
    <div className="max-w-[1600px] mx-auto p-6 min-h-screen bg-gray-50/30">
      
      {/* Top Navigation & Selectors */}
      <div className="mb-4 flex flex-col md:flex-row items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100 gap-4">
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="text-gray-400" size={18} />
            <select
              value={activeUserId}
              onChange={(e) => setActiveUserId(e.target.value)}
              className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              {appData.users.map(u => (
                <option key={u.id} value={u.id}>As: {u.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
          
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={18} />
            <select
              value={activeSeasonId}
              onChange={(e) => setActiveSeasonId(e.target.value)}
              className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              {appData.seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="text-gray-400" size={18} />
            <select
              value={activeEventId}
              onChange={(e) => setActiveEventId(e.target.value)}
              className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer max-w-[150px] truncate"
            >
              {seasonEvents.length === 0 ? <option value="">No Events</option> : null}
              {seasonEvents.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
            <Settings2 className="text-indigo-600" size={18} />
            <select
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="text-sm font-bold text-indigo-900 bg-transparent outline-none cursor-pointer max-w-[150px] truncate"
            >
              {eventSessions.length === 0 ? <option value="">No Sessions</option> : null}
              {eventSessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Map className="text-gray-400" size={18} />
            <select
              value={activeDivisionId}
              onChange={(e) => setActiveDivisionId(e.target.value)}
              className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              {availableDivisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCreateSessionModalOpen(true)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            + New Session
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UsersIcon className="text-indigo-600" size={28} />
            {activeSession.name} - {availableDivisions.find(d => d.id === activeDivisionId)?.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeUser.role === 'admin' 
              ? "Admin Mode: You can move players and edit any team." 
              : `Coach Mode: You can only manage your assigned team.`}
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          {activeUser.role === 'admin' && (
            <button 
              onClick={handleAddTeam}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus size={16} /> Add Team
            </button>
          )}

          <div className="w-px h-8 bg-gray-200"></div>

          {/* App Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setIsTryoutMode(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                !isTryoutMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Groups
            </button>
            <button 
              onClick={() => setIsTryoutMode(true)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5",
                isTryoutMode ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Settings2 size={16} /> Tryouts
            </button>
          </div>

          <div className="w-px h-8 bg-gray-200"></div>

          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold",
                viewMode === 'table' ? "bg-indigo-50 text-indigo-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              <List size={20} /> List
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold",
                viewMode === 'kanban' ? "bg-indigo-50 text-indigo-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              <LayoutGrid size={20} /> Board
            </button>
          </div>
        </div>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-280px)]">
          {/* Left Sidebar: Unassigned Pool */}
          {unassignedTeam && (
            <div className="w-full xl:w-[400px] flex-shrink-0 h-[500px] xl:h-full">
              <TeamSection 
                team={unassignedTeam} 
                players={getProcessedPlayers(hydratedPlayers, unassignedTeam)} 
                isTryoutMode={isTryoutMode}
                viewMode="kanban"
                isSidebar={true}
                onStatusChange={handleStatusChange}
                onAttendanceChange={handleAttendanceChange}
                onTeamNameChange={handleTeamNameChange}
                onSortChange={handleSortChange}
                onFilterChange={handleFilterChange}
                onDeleteTeam={activeUser.role === 'admin' ? handleDeleteTeam : undefined}
                onInviteAllTeam={activeUser.role === 'admin' || activeUser.assignedTeamId === unassignedTeam.id ? handleInviteAllTeam : undefined}
                onViewDetails={(p) => setSelectedPlayerForDetails(p)}
                activeUserId={activeUserId}
              />
            </div>
          )}

          {/* Right Main Area: Assigned Teams */}
          <div className={cn(
            "flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm custom-scrollbar",
            viewMode === 'kanban' 
              ? "flex gap-6 items-start h-full overflow-x-auto overflow-y-hidden p-6" 
              : "h-full overflow-y-auto p-8"
          )}>
            {viewMode === 'table' ? (
              <div className="max-w-4xl mx-auto">
                {assignedTeams.map(team => (
                  <TeamSection 
                    key={team.id} 
                    team={team} 
                    players={getProcessedPlayers(hydratedPlayers, team)} 
                    isTryoutMode={isTryoutMode}
                    viewMode={viewMode}
                    onStatusChange={handleStatusChange}
                    onAttendanceChange={handleAttendanceChange}
                    onTeamNameChange={handleTeamNameChange}
                    onSortChange={handleSortChange}
                    onFilterChange={handleFilterChange}
                    onDeleteTeam={activeUser.role === 'admin' ? handleDeleteTeam : undefined}
                    onInviteAllTeam={activeUser.role === 'admin' || activeUser.assignedTeamId === team.id ? handleInviteAllTeam : undefined}
                    onViewDetails={(p) => setSelectedPlayerForDetails(p)}
                    activeUserId={activeUserId}
                  />
                ))}
              </div>
            ) : (
              assignedTeams.map(team => (
                <TeamSection 
                  key={team.id} 
                  team={team} 
                  players={getProcessedPlayers(hydratedPlayers, team)} 
                  isTryoutMode={isTryoutMode}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAttendanceChange={handleAttendanceChange}
                  onTeamNameChange={handleTeamNameChange}
                  onSortChange={handleSortChange}
                  onFilterChange={handleFilterChange}
                  onDeleteTeam={activeUser.role === 'admin' ? handleDeleteTeam : undefined}
                  onInviteAllTeam={activeUser.role === 'admin' || activeUser.assignedTeamId === team.id ? handleInviteAllTeam : undefined}
                  onViewDetails={(p) => setSelectedPlayerForDetails(p)}
                  activeUserId={activeUserId}
                />
              ))
            )}
          </div>
        </div>

        <DragOverlay>
          {activePlayer ? (
            <PlayerCard 
              player={activePlayer} 
              isTryoutMode={isTryoutMode} 
              viewMode={activePlayer.teamId.includes('unassigned') ? 'kanban' : viewMode} 
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create Session Modal */}
      {isCreateSessionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Session for {activeEvent.name}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Session Name</label>
                <input 
                  type="text" 
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g. Day 2 Tryouts"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Base Teams & Players On</label>
                <select 
                  value={cloneSessionId}
                  onChange={(e) => setCloneSessionId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="none">Start Fresh (All Unassigned)</option>
                  {eventSessions.map(s => (
                    <option key={s.id} value={s.id}>Clone from {s.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Cloning a session will copy over all teams, player statuses, and notes exactly as they were.</p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsCreateSessionModalOpen(false)}
                className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateSession}
                disabled={!newSessionName.trim()}
                className="px-4 py-2 font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      {selectedPlayerForDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col h-[80vh]">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-lg">#{selectedPlayerForDetails.tryoutNumber}</span>
                  {selectedPlayerForDetails.name}
                </h2>
                <p className="text-gray-500 mt-1 flex items-center gap-4">
                  <span>{selectedPlayerForDetails.position}</span>
                  <span>Rating: <span className="font-bold text-gray-800">{selectedPlayerForDetails.rating}</span></span>
                </p>
              </div>
              <button onClick={() => setSelectedPlayerForDetails(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <h3 className="font-bold text-gray-800 mb-3 text-lg">Coach Notes for this Event</h3>
              {selectedPlayerForDetails.notes.length === 0 ? (
                <p className="text-gray-500 italic mb-6">No notes added yet.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {selectedPlayerForDetails.notes.map(note => {
                    const author = appData.users.find(u => u.id === note.coachId);
                    return (
                      <div key={note.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-indigo-700">{author?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-gray-700 text-sm">{note.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Add a new note..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNotesChange(selectedPlayerForDetails.id, e.currentTarget.value);
                    e.currentTarget.value = '';
                    // Local state update for responsiveness
                    const updatedPlayer = {
                      ...selectedPlayerForDetails,
                      notes: [
                        ...selectedPlayerForDetails.notes,
                        {
                          id: `note-${Date.now()}`,
                          coachId: activeUserId,
                          eventId: activeEventId,
                          sessionId: activeSessionId,
                          text: e.currentTarget.value,
                          timestamp: Date.now()
                        }
                      ]
                    };
                    setSelectedPlayerForDetails(updatedPlayer);
                  }
                }}
              />
              <button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input.value.trim()) {
                    handleNotesChange(selectedPlayerForDetails.id, input.value);
                    const updatedPlayer = {
                      ...selectedPlayerForDetails,
                      notes: [
                        ...selectedPlayerForDetails.notes,
                        {
                          id: `note-${Date.now()}`,
                          coachId: activeUserId,
                          eventId: activeEventId,
                          sessionId: activeSessionId,
                          text: input.value,
                          timestamp: Date.now()
                        }
                      ]
                    };
                    setSelectedPlayerForDetails(updatedPlayer);
                    input.value = '';
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
