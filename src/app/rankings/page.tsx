"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppData, getHydratedPlayers, Player, EventPlayer } from '@/types';
import { fetchAppData } from '@/app/actions/dbSync';
import { Trophy, GripVertical, Calendar, Layers, Map } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Sortable Item Component
function SortablePlayerRow({ player, index, disabled }: { player: Player, index: number, disabled: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: player.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg mb-2 shadow-sm",
        isDragging && "z-50 ring-2 ring-indigo-500 shadow-lg scale-[1.02]",
        disabled && "opacity-75 bg-gray-50 cursor-not-allowed"
      )}
    >
      <div className={cn("text-gray-400", !disabled && "cursor-grab")} {...attributes} {...listeners}>
        <GripVertical size={20} />
      </div>
      <div className="font-black text-xl text-gray-300 w-8 text-right">{index + 1}</div>
      <div className="flex-1 font-bold text-gray-800">{player.name}</div>
      <div className="text-gray-500 text-sm w-24">{player.position}</div>
      <div className="bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded text-xs w-16 text-center">#{player.tryoutNumber}</div>
    </div>
  );
}

export default function RankingsPage() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeDivisionId, setActiveDivisionId] = useState<string>('');
  const [activeUserId, setActiveUserId] = useState<string>('');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await fetchAppData();
        setAppData(data);
        
        const initialSeason = data.seasons[0]?.id || '';
        setActiveSeasonId(initialSeason);
        
        const events = data.events.filter(e => e.seasonId === initialSeason);
        const initialEvent = events[0]?.id || '';
        setActiveEventId(initialEvent);

        if (events[0]?.divisionIds.length > 0) {
          setActiveDivisionId(events[0].divisionIds[0]);
        }
      } catch (err) {
        console.error('Failed to load ranking data:', err);
      } finally {
        setIsMounted(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (appData && isMounted) {
      // Database sync would happen here if implemented for rankings
    }
  }, [appData, isMounted]);

  const activeUser = useMemo(() => appData?.users.find(u => u.id === activeUserId), [appData, activeUserId]);
  const seasonEvents = useMemo(() => appData?.events.filter(e => e.seasonId === activeSeasonId && e.type === 'ranking') || [], [appData, activeSeasonId]);
  const activeEvent = useMemo(() => seasonEvents.find(e => e.id === activeEventId), [seasonEvents, activeEventId]);

  const availableDivisions = useMemo(() => {
    if (!appData || !activeEvent) return [];
    return appData.divisions.filter(d => activeEvent.divisionIds.includes(d.id));
  }, [appData, activeEvent]);

  // Sync defaults
  useEffect(() => {
    if (isMounted && activeSeasonId && appData) {
      const events = appData.events.filter(e => e.seasonId === activeSeasonId && e.type === 'ranking');
      if (!events.some(e => e.id === activeEventId)) {
        setActiveEventId(events[0]?.id || '');
      }
    }
  }, [activeSeasonId, isMounted, appData, activeEventId]);

  useEffect(() => {
    if (isMounted && activeEventId && appData) {
      const event = appData.events.find(e => e.id === activeEventId);
      if (event && !event.divisionIds.includes(activeDivisionId)) {
        setActiveDivisionId(event.divisionIds[0] || '');
      }
    }
  }, [activeEventId, isMounted, appData, activeDivisionId]);

  const hydratedPlayers = useMemo(() => {
    if (!appData || !activeEvent || !activeEvent.rankingPlayers) return [];
    const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === activeDivisionId);
    return getHydratedPlayers(divPlayers, activeEvent.rankingPlayers);
  }, [appData, activeEvent, activeDivisionId]);

  const activeDivisionTeams = useMemo(() => {
    if (!activeEvent || !activeEvent.rankingTeams) return [];
    return activeEvent.rankingTeams.filter(t => t.divisionId === activeDivisionId);
  }, [activeEvent, activeDivisionId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateRankingPlayers = (updater: (prev: EventPlayer[]) => EventPlayer[]) => {
    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        events: prev.events.map(e => e.id === activeEventId ? {
          ...e,
          rankingPlayers: updater(e.rankingPlayers || [])
        } : e)
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent, teamId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !appData || !activeEvent || !activeEvent.rankingPlayers) return;

    // Permissions
    if (activeUser?.role === 'coach' && activeUser.assignedTeamId !== teamId) {
      alert("You can only reorder players within your assigned team.");
      return;
    }

    // Get the players ONLY in this team (in their current order)
    const teamPlayerIds = activeEvent.rankingPlayers
      .filter(ep => ep.teamId === teamId)
      .map(ep => ep.id);

    const oldIndex = teamPlayerIds.indexOf(active.id as string);
    const newIndex = teamPlayerIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newTeamPlayerIds = arrayMove(teamPlayerIds, oldIndex, newIndex);

      updateRankingPlayers(prev => {
        const otherPlayers = prev.filter(ep => ep.teamId !== teamId);
        const reorderedTeamPlayers = newTeamPlayerIds.map(id => prev.find(ep => ep.id === id)!);
        return [...otherPlayers, ...reorderedTeamPlayers];
      });
    }
  };

  if (!isMounted || !appData || !activeUser) return <div className="p-8">Loading...</div>;

  if (!activeEvent || !activeEvent.rankingTeams) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Ranking Events Found</h2>
        <p>Please create a ranking event to begin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6 min-h-screen">
      
      {/* Top Controls */}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <Trophy className="text-indigo-600" size={28} />
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Team Rankings</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <select
            value={activeUserId}
            onChange={(e) => setActiveUserId(e.target.value)}
            className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            {appData.users.map(u => (
              <option key={u.id} value={u.id}>As: {u.name}</option>
            ))}
          </select>
          
          <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={18} />
            <select
              value={activeSeasonId}
              onChange={(e) => setActiveSeasonId(e.target.value)}
              className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer"
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
              className="text-sm font-bold text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              {seasonEvents.length === 0 ? <option value="">No Events</option> : null}
              {seasonEvents.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Map className="text-gray-400" size={18} />
            <select
              value={activeDivisionId}
              onChange={(e) => setActiveDivisionId(e.target.value)}
              className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              {availableDivisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-8 font-medium shadow-sm">
        Drag and drop players within your team to update their 1-to-N ranking for <span className="font-bold">{activeEvent.name}</span>. You can view all teams in {availableDivisions.find(d => d.id === activeDivisionId)?.name}, but you can only rank your assigned team.
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {activeDivisionTeams.map(team => {
          const teamPlayers = hydratedPlayers.filter(p => p.teamId === team.id && p.status !== 'declined');
          const isAllowedToEdit = activeUser.role === 'admin' || activeUser.assignedTeamId === team.id;

          return (
            <div key={team.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h2 className="font-bold text-gray-800 text-lg">{team.name} Rankings</h2>
                {!isAllowedToEdit && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-bold uppercase tracking-wider">View Only</span>
                )}
              </div>
              
              <div className="p-4">
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, team.id)}
                >
                  <SortableContext 
                    items={teamPlayers.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {teamPlayers.length === 0 ? (
                      <div className="text-center text-gray-400 italic py-8">No active players to rank.</div>
                    ) : (
                      teamPlayers.map((player, index) => (
                        <SortablePlayerRow 
                          key={player.id} 
                          player={player} 
                          index={index} 
                          disabled={!isAllowedToEdit} 
                        />
                      ))
                    )}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
