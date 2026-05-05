"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { loadAppData, AppData, getHydratedPlayers, PlayerStatus } from '@/lib/mockData';
import { Trophy, Users, ShieldAlert, Crosshair, Calendar, Layers, Settings2, Map } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function FinalSelectionPage() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeDivisionId, setActiveDivisionId] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

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

    setIsMounted(true);
  }, []);

  const seasonEvents = useMemo(() => appData?.events.filter(e => e.seasonId === activeSeasonId && e.type === 'tryout') || [], [appData, activeSeasonId]);
  const activeEvent = useMemo(() => seasonEvents.find(e => e.id === activeEventId), [seasonEvents, activeEventId]);
  
  const eventSessions = useMemo(() => appData?.sessions.filter(s => s.eventId === activeEventId) || [], [appData, activeEventId]);
  const activeSession = useMemo(() => eventSessions.find(s => s.id === activeSessionId), [eventSessions, activeSessionId]);

  const availableDivisions = useMemo(() => {
    if (!appData || !activeEvent) return [];
    return appData.divisions.filter(d => activeEvent.divisionIds.includes(d.id));
  }, [appData, activeEvent]);

  // Handle cascading updates
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

  if (!isMounted || !appData) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!activeEvent || !activeSession) {
    return <div className="p-8">No Tryout Events/Sessions found.</div>;
  }

  const activeDivisionTeams = activeSession.teams.filter(t => t.divisionId === activeDivisionId);
  const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === activeDivisionId);
  const finalPlayers = getHydratedPlayers(divPlayers, activeSession.sessionPlayers);

  const statusColors: Record<PlayerStatus, string> = {
    'none': 'bg-gray-100 text-gray-600',
    'invited': 'bg-blue-100 text-blue-700',
    'declined': 'bg-red-100 text-red-700',
    'accepted': 'bg-green-100 text-green-700',
    'waiting to send invitation': 'bg-yellow-100 text-yellow-700',
  };

  const statusLabels: Record<PlayerStatus, string> = {
    'none': 'No Status',
    'invited': 'Invited',
    'declined': 'Declined',
    'accepted': 'Accepted',
    'waiting to send invitation': 'Waitlist',
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 min-h-screen">

      <div className="mb-4 flex flex-col md:flex-row items-center justify-end bg-white p-3 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center gap-2">
            <Settings2 className="text-indigo-600" size={18} />
            <select
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="text-sm font-bold text-indigo-900 bg-indigo-50 outline-none px-3 py-1.5 rounded-lg cursor-pointer max-w-[150px] truncate"
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
      </div>

      <div className="mb-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Final Team Selection
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Overview for: <span className="font-bold text-gray-800">{activeEvent.name} ({activeSession.name}) - {availableDivisions.find(d => d.id === activeDivisionId)?.name}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Users size={18} className="text-indigo-500" />
              Total Players
            </h3>
            <p className="text-3xl font-black text-gray-800">{finalPlayers.length}</p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
            <h3 className="font-bold text-green-900 flex items-center gap-2 mb-2">
              <Trophy size={18} className="text-green-600" />
              Accepted
            </h3>
            <p className="text-3xl font-black text-green-800">
              {finalPlayers.filter(p => p.status === 'accepted').length}
            </p>
          </div>

          <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
            <h3 className="font-bold text-yellow-900 flex items-center gap-2 mb-2">
              <ShieldAlert size={18} className="text-yellow-600" />
              Waitlisted
            </h3>
            <p className="text-3xl font-black text-yellow-800">
              {finalPlayers.filter(p => p.status === 'waiting to send invitation').length}
            </p>
          </div>
        </div>

        {/* Teams Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {activeDivisionTeams.filter(t => !t.id.includes('unassigned')).map(team => {
            const teamPlayers = finalPlayers.filter(p => p.teamId === team.id);
            const activePlayerCount = teamPlayers.filter(p => p.status !== 'declined').length;
            
            return (
              <div key={team.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <h2 className="font-bold text-gray-800 text-lg">{team.name}</h2>
                  <div className="bg-white border border-gray-200 text-gray-600 font-bold px-3 py-1 rounded-full text-xs shadow-sm">
                    {activePlayerCount} {activePlayerCount === 1 ? 'Player' : 'Players'}
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {teamPlayers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic text-sm">
                      No players assigned to this team.
                    </div>
                  ) : (
                    teamPlayers.map(player => (
                      <div key={player.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-600 w-8 text-right text-sm">#{player.tryoutNumber}</span>
                          <span className="font-semibold text-gray-900 text-sm w-32 truncate">{player.name}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1 w-24">
                            <Crosshair size={12} /> {player.position}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                          statusColors[player.status]
                        )}>
                          {statusLabels[player.status]}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
