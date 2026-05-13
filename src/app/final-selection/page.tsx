"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { AppData, User, Season, Division, GlobalPlayer, AppEvent, Session, FieldConfig, EventPlayer, CoachNote, Team, Player, PlayerStatus, getHydratedPlayers } from "@/types";
import { fetchAppData, syncAppData } from '@/app/actions/dbSync';
import { Trophy, Users, ShieldAlert, Crosshair, Calendar, Layers, Settings2, Map, GripVertical, Info, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, rectIntersection } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Draggable Player Card for the Selection Board
function SelectionPlayerCard({ player, statusColors, statusLabels, onStatusChange }: { player: Player, statusColors: any, statusLabels: any, onStatusChange?: (id: string, s: PlayerStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white p-2 mb-2 rounded-lg border shadow-sm flex items-center justify-between group transition-all",
        isDragging ? "opacity-50 border-indigo-500 shadow-xl z-50 ring-2 ring-indigo-500" : "hover:border-indigo-300"
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <div {...attributes} {...listeners} className="text-gray-300 hover:text-indigo-400 cursor-grab active:cursor-grabbing p-1">
          <GripVertical size={14} />
        </div>
        <div className="bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded text-[10px] min-w-[28px] text-center">
          #{player.tryoutNumber}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-gray-900 text-[11px] truncate">{player.name}</span>
          <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">{player.position}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <select 
          value={player.status}
          onChange={(e) => {
            onStatusChange?.(player.id, e.target.value as PlayerStatus);
          }}
          className={cn(
            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded outline-none cursor-pointer border-none",
            statusColors[player.status] || 'bg-gray-100 text-gray-500'
          )}
        >
          {['none', 'invited', 'waiting to send invitation', 'accepted', 'declined'].map(s => (
            <option key={s} value={s} className="bg-white text-gray-900">{statusLabels[s] || s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Droppable Team Column
function TeamColumn({ team, players, statusColors, statusLabels, onStatusChange }: { team: any, players: Player[], statusColors: any, statusLabels: any, onStatusChange?: (id: string, s: PlayerStatus) => void }) {
  const { setNodeRef } = useSortable({
    id: team.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex-shrink-0 w-[280px] bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col h-full overflow-hidden"
    >
      <div className="bg-white border-b border-gray-100 p-3 flex items-center justify-between">
        <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} className="text-indigo-500" />
          {team.name}
        </h3>
        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
          {players.length}
        </span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
        <SortableContext items={players.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {players.map(player => (
            <SelectionPlayerCard 
              key={player.id} 
              player={player} 
              statusColors={statusColors} 
              statusLabels={statusLabels} 
              onStatusChange={onStatusChange}
            />
          ))}
          {players.length === 0 && (
            <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center px-4">
              Drag Players Here to Assign
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function FinalSelectionPage() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeDivisionId, setActiveDivisionId] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const init = async () => {
      try {
        const data = await fetchAppData();
        setAppData(data);
        
        // Set initial defaults
        const initialSeason = data.seasons[0]?.id || '';
        setActiveSeasonId(initialSeason);
        
        const initialEvents = data.events.filter(e => e.seasonId === initialSeason && e.type === 'tryout');
        const initialEvent = initialEvents[0]?.id || '';
        setActiveEventId(initialEvent);

        const initialSessions = data.sessions.filter(s => s.eventId === initialEvent);
        const lastSession = initialSessions[initialSessions.length - 1]?.id || '';
        setActiveSessionId(lastSession);

        const ev = initialEvents[0];
        if (ev && ev.divisionIds.length > 0) {
          setActiveDivisionId(ev.divisionIds[0]);
        } else {
          setActiveDivisionId(data.divisions[0]?.id || '');
        }
      } catch (err) {
        console.error('Failed to load selection board data:', err);
      } finally {
        setIsMounted(true);
      }
    };
    init();
  }, []);

  const seasonEvents = useMemo(() => appData?.events.filter(e => e.seasonId === activeSeasonId && e.type === 'tryout') || [], [appData, activeSeasonId]);
  const activeEvent = useMemo(() => seasonEvents.find(e => e.id === activeEventId), [seasonEvents, activeEventId]);
  const eventSessions = useMemo(() => appData?.sessions.filter(s => s.eventId === activeEventId) || [], [appData, activeEventId]);
  const activeSession = useMemo(() => eventSessions.find(s => s.id === activeSessionId), [eventSessions, activeSessionId]);

  const availableDivisions = useMemo(() => {
    if (!appData || !activeEvent) return [];
    return appData.divisions.filter(d => activeEvent.divisionIds.includes(d.id));
  }, [appData, activeEvent]);

  // Current Seasonal Teams for this division
  const activeDivisionTeams = useMemo(() => {
    if (!appData || !activeDivisionId) return [];
    return appData.teams.filter(t => t.divisionId === activeDivisionId);
  }, [appData, activeDivisionId]);

  // Hydrated Players with their tryout data
  const finalPlayers = useMemo(() => {
    if (!appData || !activeSession || !activeDivisionId) return [];
    const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === activeDivisionId);
    return getHydratedPlayers(divPlayers, activeSession.sessionPlayers);
  }, [appData, activeSession, activeDivisionId]);

  // DB Sync
  const calculateFingerprint = (data: AppData) => {
    return JSON.stringify(data.globalPlayers.map(p => ({ id: p.id, t: p.teamId, s: p.status })));
  };

  const lastSyncedDataRef = React.useRef<string>('');

  useEffect(() => {
    if (!isMounted || !appData) return;
    const fingerprint = calculateFingerprint(appData);
    if (fingerprint === lastSyncedDataRef.current) return;

    const timer = setTimeout(async () => {
      try {
        await syncAppData(appData);
        lastSyncedDataRef.current = fingerprint;
      } catch (err) {
        console.error('Failed to sync Selection Board:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [appData, isMounted]);

  // Status mapping
  const statusColors: Record<PlayerStatus, string> = {
    'none': 'bg-gray-100 text-gray-500',
    'invited': 'bg-blue-100 text-blue-600',
    'declined': 'bg-red-100 text-red-600',
    'accepted': 'bg-green-100 text-green-600',
    'waiting to send invitation': 'bg-yellow-100 text-yellow-600',
  };

  const statusLabels: Record<PlayerStatus, string> = {
    'none': 'NEW',
    'invited': 'SENT',
    'declined': 'DECL',
    'accepted': 'YES',
    'waiting to send invitation': 'WAIT',
  };

  const handleDragStart = (event: DragStartEvent) => {
    const player = finalPlayers.find(p => p.id === event.active.id);
    setActivePlayer(player || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayer(null);
    if (!over) return;

    const playerId = String(active.id);
    const targetId = String(over.id);

    // If targetId is a team ID or a player within a team
    let teamId = targetId;
    const isTeam = activeDivisionTeams.some(t => t.id === targetId);
    if (!isTeam) {
      const targetPlayer = finalPlayers.find(p => p.id === targetId);
      if (targetPlayer) teamId = targetPlayer.teamId;
    }

    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        globalPlayers: prev.globalPlayers.map(gp => 
          gp.id === playerId ? { ...gp, teamId: teamId } : gp
        )
      };
    });
  };

  const handleStatusChange = (id: string, status: PlayerStatus) => {
    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        globalPlayers: prev.globalPlayers.map(gp => 
          gp.id === id ? { ...gp, status } : gp
        )
      };
    });
  };

  if (!isMounted || !appData) return <div className="p-12 text-center font-black text-gray-300">INITIALIZING BOARD...</div>;
  if (!activeEvent || !activeSession) return <div className="p-12 text-center font-black text-gray-300 uppercase tracking-widest">Select an Event to Begin Selection</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header Controls */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-indigo-600" />
            <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Final Team Selection</h1>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <select value={activeSeasonId} onChange={(e) => setActiveSeasonId(e.target.value)} className="text-[10px] font-black uppercase bg-white px-2 py-1.5 rounded-lg outline-none border-none shadow-sm cursor-pointer">
              {appData.seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={activeEventId} onChange={(e) => setActiveEventId(e.target.value)} className="text-[10px] font-black uppercase bg-white px-2 py-1.5 rounded-lg outline-none border-none shadow-sm cursor-pointer max-w-[120px]">
              {seasonEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={activeSessionId} onChange={(e) => setActiveSessionId(e.target.value)} className="text-[10px] font-black uppercase bg-indigo-600 text-white px-2 py-1.5 rounded-lg outline-none border-none shadow-sm cursor-pointer max-w-[120px]">
              {eventSessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={activeDivisionId} onChange={(e) => setActiveDivisionId(e.target.value)} className="text-[10px] font-black uppercase bg-white px-2 py-1.5 rounded-lg outline-none border-none shadow-sm cursor-pointer">
              {availableDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selection for</span>
             <span className="text-xs font-bold text-gray-900">{availableDivisions.find(d => d.id === activeDivisionId)?.name}</span>
           </div>
        </div>
      </div>

      {/* Main Drafting Board */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={rectIntersection} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Scouting Pool (Grouped by Field) */}
          <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col shadow-lg z-10">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Tryout Scouting Pool</h2>
              <p className="text-xs font-bold text-gray-700">Grouped by Last Session Field</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeSession.fields.map(field => {
                const fieldPlayers = finalPlayers.filter(p => p.fieldId === field.id && (!p.teamId || p.teamId === 'unassigned'));
                if (fieldPlayers.length === 0 && field.id.includes('unassigned')) return null;
                
                return (
                  <div key={field.id} className="mb-6">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between border-b border-gray-100 pb-1">
                      {field.name}
                      <span className="bg-gray-100 text-gray-500 px-1.5 rounded">{fieldPlayers.length}</span>
                    </h3>
                    <SortableContext items={fieldPlayers.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {fieldPlayers.sort((a,b) => (a.rank || 99) - (b.rank || 99)).map(player => (
                        <SelectionPlayerCard 
                          key={player.id} 
                          player={player} 
                          statusColors={statusColors} 
                          statusLabels={statusLabels} 
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </SortableContext>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Seasonal Team Kanban */}
          <div className="flex-1 p-6 overflow-x-auto flex gap-6 bg-gray-100/30 custom-scrollbar">
            {activeDivisionTeams.map(team => (
              <TeamColumn 
                key={team.id} 
                team={team} 
                players={finalPlayers.filter(p => p.teamId === team.id)} 
                statusColors={statusColors} 
                statusLabels={statusLabels} 
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activePlayer ? (
            <div className="bg-white p-3 rounded-xl shadow-2xl border-2 border-indigo-500 flex items-center gap-3 w-[260px] opacity-90 scale-105">
               <div className="bg-indigo-600 text-white font-black px-2 py-1 rounded text-xs">
                 #{activePlayer.tryoutNumber}
               </div>
               <span className="font-bold text-gray-900">{activePlayer.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
