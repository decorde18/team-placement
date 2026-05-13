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
  rectIntersection,
  DragOverlay
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AppData, AppEvent, EventPlayer, FieldConfig, PlayerStatus, SortOption, FilterOption, PlayerAttendance, Session, Player, CoachNote, getHydratedPlayers } from '@/types';
import { DataSelectors } from './DataSelectors';
import { fetchAppData, syncAppData } from '@/app/actions/dbSync';
import { TeamSection } from './TeamSection';
import { PlayerCard } from './PlayerCard';
import { LayoutGrid, List, Settings2, Users as UsersIcon, Plus, Calendar, Shield, Map, Layers, Loader2, ArrowUpDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to sort and filter players
const getProcessedPlayers = (players: Player[], field: FieldConfig) => {
  let fieldPlayers = players.filter(p => p.fieldId === field.id);
  
  if (field.filterBy !== 'all') {
    fieldPlayers = fieldPlayers.filter(p => p.position === field.filterBy);
  }

    // Rating Filter (Numerical thresholds)
    if (field.ratingFilter && field.ratingFilter !== 'all') {
      const minRating = parseFloat(field.ratingFilter);
      if (!isNaN(minRating)) {
        fieldPlayers = fieldPlayers.filter(p => p.rating >= minRating);
      }
    }

  const direction = field.sortDirection || 'asc';

  // Single, unified sort to prevent logic interference
  fieldPlayers.sort((a, b) => {
    // 1. Primary Sort (Rating, Name, Position, etc.)
    if (field.sortBy && field.sortBy !== 'manual') {
      const direction = field.sortDirection || 'asc';
      
      if (field.sortBy === 'name') {
        const cmp = a.name.localeCompare(b.name);
        if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
      } else if (field.sortBy === 'rating') {
        const diff = a.rating - b.rating;
        if (diff !== 0) return direction === 'asc' ? diff : -diff;
      } else if (field.sortBy === 'position') {
        const cmp = a.position.localeCompare(b.position);
        if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
      } else if (field.sortBy === 'manual_rank') {
        const diff = (a.rank || 0) - (b.rank || 0);
        if (diff !== 0) return direction === 'asc' ? diff : -diff;
      }
    }

    // 2. Secondary Sort (Tie-breaker by status)
    if (a.status === 'declined' && b.status !== 'declined') return 1;
    if (a.status !== 'declined' && b.status === 'declined') return -1;
    
    // 3. Final Tie-breaker (Name)
    return a.name.localeCompare(b.name);
  });

  return fieldPlayers;
};

export function PlayerBoard() {
  const [batchLimit, setBatchLimit] = useState<'all' | '10' | '20' | '30'>('all');
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeDivisionId, setActiveDivisionId] = useState<string>('');
  const [activeUserId, setActiveUserId] = useState<string>('');
  
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [isTryoutMode, setIsTryoutMode] = useState(false);
  const [isDragging, setIsDraggingGlobal] = useState(false);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [selectedPlayerForDetails, setSelectedPlayerForDetails] = useState<Player | null>(null);

  // Modals State
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [cloneSessionId, setCloneSessionId] = useState<string>('none');

  const lastSyncedDataRef = React.useRef<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        const data = await fetchAppData();
        setAppData(data);
        if (data) {
          const initialSeason = data.seasons[0]?.id || '';
          setActiveSeasonId(initialSeason);
          const initialEvents = data.events.filter(e => e.seasonId === initialSeason);
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

          // Capture initial fingerprint to prevent immediate sync on load
          lastSyncedDataRef.current = JSON.stringify(data.sessions.map(s => ({
            id: s.id,
            fields: s.fields.map(f => ({ id: f.id, name: f.name })),
            players: s.sessionPlayers.map(p => ({ id: p.id, fieldId: p.fieldId, status: p.status, att: p.attendance, noteCount: p.notes.length }))
          })));
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load real data from DB:', err);
        setIsLoading(false);
      }
    };
    init();
    setIsMounted(true);
  }, []);

  // Debounced Sync Effect
  useEffect(() => {
    if (!appData || !isMounted) return;

    // Create a fingerprint of ONLY the data that belongs in the DB
    // (Player movements, field names, and notes)
    const currentDataFingerprint = JSON.stringify(appData.sessions.map(s => ({
      id: s.id,
      fields: s.fields.map(f => ({ id: f.id, name: f.name })),
      players: s.sessionPlayers.map(p => ({ id: p.id, fieldId: p.fieldId, status: p.status, att: p.attendance, noteCount: p.notes.length }))
    })));

    // If the important data hasn't changed, DO NOT sync (silences sort/filter noise)
    if (currentDataFingerprint === lastSyncedDataRef.current || isDragging) return;

    const timer = setTimeout(async () => {
      try {
        const result = await syncAppData(appData);
        
        // Update our 'last synced' fingerprint so we don't sync the same thing twice
        lastSyncedDataRef.current = currentDataFingerprint;
        
        // ONLY update state if we got new IDs back from the server
        // This is critical to prevent the infinite refresh loop
        if (result.success && result.idMappings && Object.keys(result.idMappings).length > 0) {
          setAppData(prev => {
            if (!prev) return prev;
            let newData = { ...prev };
            
            // Apply mappings to sessions, fields, and players
            newData.sessions = newData.sessions.map(s => {
              const mappedSessionId = result.idMappings![s.id];
              const updatedSession = mappedSessionId ? { ...s, id: mappedSessionId } : s;
              
              return {
                ...updatedSession,
                fields: updatedSession.fields.map(f => 
                  result.idMappings![f.id] ? { ...f, id: result.idMappings![f.id] } : f
                ),
                sessionPlayers: updatedSession.sessionPlayers.map(sp => 
                  result.idMappings![sp.fieldId] ? { ...sp, fieldId: result.idMappings![sp.fieldId] } : sp
                )
              };
            });
            
            return newData;
          });
        }
      } catch (err) {
        console.error("Failed to sync to DB:", err);
      }
      
    }, 1500);

    return () => clearTimeout(timer);
  }, [appData, isMounted, isDragging]);

  const activeUser = useMemo(() => appData?.users.find(u => u.id === activeUserId), [appData, activeUserId]);
  const seasonEvents = useMemo(() => appData?.events.filter(e => e.seasonId === activeSeasonId) || [], [appData, activeSeasonId]);
  const activeEvent = useMemo(() => seasonEvents.find(e => e.id === activeEventId), [seasonEvents, activeEventId]);
  const eventSessions = useMemo(() => appData?.sessions.filter(s => s.eventId === activeEventId) || [], [appData, activeEventId]);
  const activeSession = useMemo(() => eventSessions.find(s => s.id === activeSessionId), [eventSessions, activeSessionId]);
  const availableDivisions = useMemo(() => {
    if (!appData || !activeEvent) return [];
    return appData.divisions.filter(d => activeEvent.divisionIds.includes(d.id));
  }, [appData, activeEvent]);

  useEffect(() => {
    if (isMounted && activeSeasonId && appData) {
      const events = appData.events.filter(e => e.seasonId === activeSeasonId);
      if (!events.some(e => e.id === activeEventId)) setActiveEventId(events[0]?.id || '');
    }
  }, [activeSeasonId, isMounted, appData, activeEventId]);

  useEffect(() => {
    if (isMounted && activeEventId && appData) {
      const sessions = appData.sessions.filter(s => s.eventId === activeEventId);
      if (!sessions.some(s => s.id === activeSessionId)) setActiveSessionId(sessions[0]?.id || '');
      const event = appData.events.find(e => e.id === activeEventId);
      if (event && !event.divisionIds.includes(activeDivisionId)) setActiveDivisionId(event.divisionIds[0] || '');
    }
  }, [activeEventId, isMounted, appData, activeSessionId, activeDivisionId]);

  const hydratedPlayers = useMemo(() => {
    if (!appData || !activeSession || !activeDivisionId) return [];
    const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === activeDivisionId);
    return getHydratedPlayers(divPlayers, activeSession.sessionPlayers);
  }, [appData, activeSession, activeDivisionId]);

  const activeDivisionFields = useMemo(() => {
    if (!activeSession || !activeDivisionId) return [];
    return activeSession.fields.filter(f => f.divisionId === activeDivisionId);
  }, [activeSession, activeDivisionId]);

  const updateSessionPlayers = (updater: (prev: EventPlayer[]) => EventPlayer[]) => {
    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === activeSessionId ? { ...s, sessionPlayers: updater(s.sessionPlayers) } : s)
      };
    });
  };

  const updateFields = (updater: (prev: FieldConfig[]) => FieldConfig[]) => {
    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === activeSessionId ? { ...s, fields: updater(s.fields) } : s)
      };
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const player = hydratedPlayers.find(p => String(p.id) === String(active.id));
    setActivePlayer(player || null);
    setIsDraggingGlobal(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePlayer(null);
    setIsDraggingGlobal(false);
    if (!over || !activeSession || !activeUser) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activePlayer = hydratedPlayers.find(p => String(p.id) === activeId);
    if (!activePlayer) return;
    const overPlayer = hydratedPlayers.find(p => String(p.id) === overId);
    const overFieldId = String(overPlayer ? overPlayer.fieldId : overId);
    const overField = activeDivisionFields.find(f => String(f.id) === overFieldId);
    if (!overField) return;

    if (overField.filterBy !== 'all' && activePlayer.position !== overField.filterBy) {
      updateFields(prev => prev.map(f => String(f.id) === String(overField.id) ? { ...f, filterBy: 'all' } : f));
    }

    let rankChanged = false;

    if (activePlayer.fieldId !== overFieldId) {
      rankChanged = true;
      updateSessionPlayers((prev) => {
        const newPlayers = [...prev];
        const activeIdx = newPlayers.findIndex(p => p.id === activeId);
        if (activeIdx === -1) return prev;

        // Update the field
        newPlayers[activeIdx] = { ...newPlayers[activeIdx], fieldId: overFieldId };

        // Recalculate ranks for the target field
        const targetFieldPlayers = newPlayers.filter(p => p.fieldId === overFieldId);
        // If dropping on a player, insert at that rank, otherwise put at end
        if (overPlayer) {
          const overIdxInField = targetFieldPlayers.findIndex(p => p.id === overId);
          // Reorder the target field players
          const otherFieldPlayers = targetFieldPlayers.filter(p => p.id !== activeId);
          otherFieldPlayers.splice(overIdxInField, 0, newPlayers[activeIdx]);
          // Assign new ranks based on position
          otherFieldPlayers.forEach((p, idx) => {
            const globalIdx = newPlayers.findIndex(np => np.id === p.id);
            if (globalIdx !== -1) newPlayers[globalIdx].rank = idx + 1;
          });
        } else {
          // Put at end of target field
          newPlayers[activeIdx].rank = targetFieldPlayers.length;
        }
        
        return newPlayers;
      });
    } else if (activeId !== overId) {
      rankChanged = true;
      // Reordering within the same field
      updateSessionPlayers((prev) => {
        const newPlayers = [...prev];
        const fieldPlayers = newPlayers.filter(p => p.fieldId === overFieldId);
        const oldIdx = fieldPlayers.findIndex(p => p.id === activeId);
        const newIdx = fieldPlayers.findIndex(p => p.id === overId);
        
        if (oldIdx !== -1 && newIdx !== -1) {
          const reordered = arrayMove(fieldPlayers, oldIdx, newIdx);
          reordered.forEach((p, idx) => {
            const globalIdx = newPlayers.findIndex(np => np.id === p.id);
            if (globalIdx !== -1) newPlayers[globalIdx].rank = idx + 1;
          });
        }
        return newPlayers;
      });
    }

    if (rankChanged && overField.sortBy !== 'manual_rank') {
      updateFields(prev => prev.map(f => String(f.id) === overFieldId ? { ...f, sortBy: 'manual_rank', sortDirection: 'asc' } : f));
    }
  };

  const handleStatusChange = (id: string, status: PlayerStatus) => {
    setAppData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        globalPlayers: prev.globalPlayers.map(gp => gp.id === id ? { ...gp, status } : gp)
      };
    });
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
          playerId: playerId,
          text,
          timestamp: Date.now()
        };
        return { ...p, notes: [...p.notes, newNote] };
      }
      return p;
    }));
  };
  
  const handleFieldNameChange = (id: string, name: string) => {
    updateFields(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  };
  const handleSortChange = (id: string, sortBy: SortOption) => {
    updateFields(prev => prev.map(f => {
        if (f.id === id) {
            // Toggle direction if clicking same sort
            if (f.sortBy === sortBy) {
                return { ...f, sortDirection: f.sortDirection === 'asc' ? 'desc' : 'asc' };
            }
            return { ...f, sortBy, sortDirection: 'asc' };
        }
        return f;
    }));
  };
  const handleFilterChange = (id: string, filterBy: FilterOption) => {
    updateFields(prev => prev.map(f => f.id === id ? { ...f, filterBy } : f));
  };
  const handleRatingFilterChange = (id: string, ratingFilter: string) => {
    updateFields(prev => prev.map(f => f.id === id ? { ...f, ratingFilter } : f));
  };

  const handleAddField = () => {
    const newFieldId = `field-${Date.now()}`;
    updateFields(prev => [...prev, {
      id: newFieldId,
      divisionId: activeDivisionId,
      name: `Field ${prev.filter(f => f.divisionId === activeDivisionId).length + 1}`,
      sortBy: 'name',
      sortDirection: 'asc',
      filterBy: 'all',
      ratingFilter: 'all'
    }]);
    
    // Explicitly trigger a fingerprint change to force a sync
    setTimeout(() => setAppData(prev => prev ? {...prev} : prev), 0);
  };

  const handleDeleteField = (id: string) => {
    const unassignedField = activeDivisionFields.find(f => f.name.includes('Unassigned') || f.id.includes('unassigned'));
    const unassignedId = unassignedField ? unassignedField.id : `unassigned-${activeDivisionId}-${activeSessionId}`;
    updateSessionPlayers(prev => prev.map(p => String(p.fieldId) === String(id) ? { ...p, fieldId: unassignedId } : p));
    updateFields(prev => prev.filter(f => String(f.id) !== String(id)));
  };

  const handleResetField = (id: string) => {
    const unassignedField = activeDivisionFields.find(f => f.name.includes('Unassigned') || f.id.includes('unassigned'));
    const unassignedId = unassignedField ? unassignedField.id : `unassigned-${activeDivisionId}-${activeSessionId}`;
    updateSessionPlayers(prev => prev.map(p => String(p.fieldId) === String(id) ? { ...p, fieldId: unassignedId } : p));
  };

  const handleCreateSession = () => {
    if (!newSessionName.trim() || !appData || !activeEvent) return;
    let clonedFields: FieldConfig[];
    let clonedSessionPlayers: EventPlayer[];
    
    if (cloneSessionId !== 'none') {
      const sourceSession = appData.sessions.find(s => s.id === cloneSessionId);
      if (sourceSession) {
        // Deep clone the session data
        const rawFields = JSON.parse(JSON.stringify(sourceSession.fields)) as FieldConfig[];
        const rawPlayers = JSON.parse(JSON.stringify(sourceSession.sessionPlayers)) as EventPlayer[];
        
        // Reset field IDs to temporary IDs so they get inserted as new records in DB
        const fieldMapping: { [key: string]: string } = {};
        clonedFields = rawFields.map(f => {
            if (f.id.includes('unassigned')) return f;
            const newTempId = `field-cloned-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            fieldMapping[f.id] = newTempId;
            return { ...f, id: newTempId };
        });

        // Update player assignments to point to new temporary field IDs
        clonedSessionPlayers = rawPlayers.map(p => {
            if (fieldMapping[p.fieldId]) {
                return { ...p, fieldId: fieldMapping[p.fieldId] };
            }
            return p;
        });
      } else return;
    } else {
      clonedFields = [];
      clonedSessionPlayers = [];
      activeEvent.divisionIds.forEach(divId => {
        clonedFields.push(
          { id: `unassigned-${divId}`, divisionId: divId, name: 'Unassigned Pool', sortBy: 'rating', sortDirection: 'asc', filterBy: 'all', ratingFilter: 'all' },
          { id: `field-1-${divId}`, divisionId: divId, name: 'Field 1', sortBy: 'name', sortDirection: 'asc', filterBy: 'all', ratingFilter: 'all' }
        );
        const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === divId);
        divPlayers.forEach(gp => {
          clonedSessionPlayers.push({ id: gp.id, status: 'none', attendance: 'present', notes: [], fieldId: `unassigned-${divId}` });
        });
      });
    }
    const newSession: Session = {
      id: `session-${Date.now()}`,
      eventId: activeEventId,
      name: newSessionName.trim(),
      date: new Date().toISOString().split('T')[0],
      fields: clonedFields,
      sessionPlayers: clonedSessionPlayers
    };
    setAppData(prev => prev ? { ...prev, sessions: [...prev.sessions, newSession] } : null);
    setActiveSessionId(newSession.id);
    setIsCreateSessionModalOpen(false);
    setNewSessionName('');
    setCloneSessionId('none');
  };

  if (!isMounted || !appData || !activeUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex flex-col items-center justify-center text-gray-500 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="font-medium animate-pulse">Syncing with database...</p>
      </div>
    );
  }

  const unassignedField = activeDivisionFields.find(f => f.name.includes('Unassigned') || f.id.includes('unassigned'));
  const assignedFields = activeDivisionFields.filter(f => f.id !== unassignedField?.id);

  return (
    <div className="max-w-[1600px] mx-auto p-6 min-h-screen bg-gray-50/30">
      <div className="mb-4 flex flex-col md:flex-row items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100 gap-4">
        <DataSelectors 
          appData={appData}
          activeUserId={activeUserId}
          setActiveUserId={setActiveUserId}
          activeSeasonId={activeSeasonId}
          setActiveSeasonId={setActiveSeasonId}
          activeEventId={activeEventId}
          setActiveEventId={setActiveEventId}
          activeSessionId={activeSessionId}
          setActiveSessionId={setActiveSessionId}
          activeDivisionId={activeDivisionId}
          setActiveDivisionId={setActiveDivisionId}
        />
        <div className="flex items-center gap-2">
          {activeEvent && (
            <button onClick={() => setIsCreateSessionModalOpen(true)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              + New Session
            </button>
          )}
        </div>
      </div>

      {!activeEvent || !activeSession ? (
        <div className="flex-1 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm flex flex-col items-center justify-center p-20 text-center space-y-4">
          <div className="bg-indigo-50 text-indigo-600 p-6 rounded-full"><Calendar size={48} /></div>
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{!activeEvent ? "No Events in this Season" : "No Sessions in this Event"}</h2>
            <p className="text-gray-500">{!activeEvent ? "Go to the Admin panel to create events for your season." : "This event doesn't have any sessions yet. Click the '+ New Session' button to start."}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <UsersIcon className="text-indigo-600" size={28} />
                {activeSession.name} - {availableDivisions.find(d => d.id === activeDivisionId)?.name}
              </h1>
              <p className="text-gray-500 text-sm mt-1">Evaluation Mode: Organize players on fields and record notes.</p>
            </div>
            <div className="flex items-center gap-6">
              {activeUser.role === 'admin' && (
                <button onClick={handleAddField} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  <Plus size={16} /> Add Field
                </button>
              )}
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setViewMode('table')} className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all", viewMode === 'table' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>List</button>
                <button onClick={() => setViewMode('kanban')} className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all", viewMode === 'kanban' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>Fields</button>
              </div>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-280px)] overflow-hidden">
              {/* Unassigned Pool Sidebar */}
              <div className="w-full xl:w-[350px] flex-shrink-0 h-full flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  {unassignedField ? (
                    <TeamSection 
                      team={unassignedField} 
                      players={getProcessedPlayers(hydratedPlayers, unassignedField)} 
                      isTryoutMode={true} 
                      viewMode="kanban" 
                      isSidebar={true}
                      isCompact={true}
                      onStatusChange={handleStatusChange} 
                      onAttendanceChange={handleAttendanceChange}
                      onTeamNameChange={handleFieldNameChange} 
                      onSortChange={handleSortChange} 
                      onFilterChange={handleFilterChange}
                      onRatingFilterChange={handleRatingFilterChange}
                      onDeleteTeam={undefined} 
                      onResetField={handleResetField}
                      activeUserId={activeUserId}
                      onViewDetails={(p) => setSelectedPlayerForDetails(p)}
                    />
                  ) : (
                    <div className="p-8 text-center text-gray-400 italic">No pool found for this division.</div>
                  )}
                </div>
                
                {/* Enhanced Batch Move Action */}
                {assignedFields.length > 0 && unassignedField && (
                  <div className="p-4 bg-indigo-50 border-t border-indigo-100">
                    <div className="flex flex-col gap-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UsersIcon size={12} className="text-indigo-500" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Move:</span>
                        </div>
                        <div className="flex bg-white border border-indigo-100 rounded-lg p-0.5 shadow-sm">
                          {['all', '10', '20', '30'].map((limit) => (
                            <button
                              key={limit}
                              onClick={() => setBatchLimit(limit as any)}
                              className={cn(
                                "px-2 py-1 text-[9px] font-black rounded-md transition-all",
                                batchLimit === limit 
                                  ? "bg-indigo-600 text-white shadow-sm" 
                                  : "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                              )}
                            >
                              {limit.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowUpDown size={12} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">To Field:</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignedFields.map(f => (
                        <button
                          key={f.id}
                          onClick={() => {
                            const playersInPool = getProcessedPlayers(hydratedPlayers, unassignedField);
                            const playersToMove = batchLimit === 'all' ? playersInPool : playersInPool.slice(0, parseInt(batchLimit));
                            
                            updateSessionPlayers(prev => prev.map(p => {
                              const match = playersToMove.find(pm => pm.id === String(p.id));
                              return match ? { ...p, fieldId: f.id } : p;
                            }));
                          }}
                          className="flex-1 min-w-[80px] text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 px-2 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Fields Area */}
              <div className={cn("flex-1 bg-gray-50/50 rounded-3xl border border-gray-100/50 p-6 overflow-auto custom-scrollbar")}>
                <div className={cn("flex h-full min-w-full", viewMode === 'kanban' ? "flex-row gap-6 items-start" : "flex-col gap-6")}>
                  {assignedFields.map(field => (
                    <TeamSection 
                      key={field.id} team={field} players={getProcessedPlayers(hydratedPlayers, field)} 
                      isTryoutMode={true} viewMode={viewMode}
                      isCompact={true}
                      onStatusChange={handleStatusChange} onAttendanceChange={handleAttendanceChange}
                      onTeamNameChange={handleFieldNameChange} onSortChange={handleSortChange} 
                      onFilterChange={handleFilterChange}
                      onRatingFilterChange={handleRatingFilterChange}
                      onDeleteTeam={handleDeleteField}
                      onResetField={handleResetField}
                      onViewDetails={(p) => setSelectedPlayerForDetails(p)}
                      activeUserId={activeUserId}
                    />
                  ))}

                  {/* Highly Visible Add Field Button - Always at the end or in middle if empty */}
                  {viewMode === 'kanban' && (
                    <button
                      onClick={handleAddField}
                      className={cn(
                        "flex-shrink-0 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white hover:shadow-xl transition-all group",
                        assignedFields.length === 0 ? "w-full h-full max-h-[400px]" : "w-[300px] h-[250px]"
                      )}
                    >
                      <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                        <Plus size={32} />
                      </div>
                      <div className="text-center">
                        <span className="block font-black text-xs uppercase tracking-widest opacity-60 mb-1">Step 1: Create a Field</span>
                        <span className="block font-bold text-lg tracking-tight">Add Evaluation Group</span>
                        <p className="text-xs text-gray-400 mt-2 max-w-[200px] mx-auto">Create fields to begin sorting players from the unassigned pool.</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <DragOverlay>{activePlayer ? <PlayerCard player={activePlayer} isTryoutMode={true} viewMode={viewMode} isCompact={true} /> : null}</DragOverlay>
          </DndContext>
        </>
      )}
      {/* ... (Modals remain similar but updated with Field terminology) */}

      {/* Create Session Modal */}
      {isCreateSessionModalOpen && activeEvent && (
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
                    const text = e.currentTarget.value;
                    handleNotesChange(selectedPlayerForDetails.id, text);
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
                          text: text,
                          timestamp: Date.now()
                        }
                      ]
                    };
                    setSelectedPlayerForDetails(updatedPlayer);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
