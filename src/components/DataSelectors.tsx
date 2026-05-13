"use client";

import React from 'react';
import { Shield, Calendar, Layers, Settings2, Map } from 'lucide-react';
import { AppData } from '@/types';

interface DataSelectorsProps {
  appData: AppData;
  activeUserId?: string;
  setActiveUserId?: (id: string) => void;
  activeSeasonId: string;
  setActiveSeasonId: (id: string) => void;
  activeEventId: string;
  setActiveEventId: (id: string) => void;
  activeSessionId?: string;
  setActiveSessionId?: (id: string) => void;
  activeDivisionId: string;
  setActiveDivisionId: (id: string) => void;
}

export function DataSelectors({
  appData,
  activeUserId,
  setActiveUserId,
  activeSeasonId,
  setActiveSeasonId,
  activeEventId,
  setActiveEventId,
  activeSessionId,
  setActiveSessionId,
  activeDivisionId,
  setActiveDivisionId
}: DataSelectorsProps) {
  const seasonEvents = appData.events.filter(e => e.seasonId === activeSeasonId) || [];
  const activeEvent = seasonEvents.find(e => e.id === activeEventId);
  const eventSessions = appData.sessions.filter(s => s.eventId === activeEventId) || [];
  const availableDivisions = appData.divisions.filter(d => activeEvent?.divisionIds.includes(d.id));

  return (
    <div className="flex flex-wrap items-center gap-4">
      {setActiveUserId && (
        <div className="flex items-center gap-2">
          <Shield className="text-gray-400" size={18} />
          <select value={activeUserId} onChange={(e) => setActiveUserId(e.target.value)} className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer">
            {appData.users.map(u => (<option key={u.id} value={u.id}>As: {u.name}</option>))}
          </select>
        </div>
      )}
      {setActiveUserId && <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>}
      
      <div className="flex items-center gap-2">
        <Calendar className="text-gray-400" size={18} />
        <select value={activeSeasonId} onChange={(e) => setActiveSeasonId(e.target.value)} className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer">
          {appData.seasons.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <Layers className="text-gray-400" size={18} />
        <select value={activeEventId} onChange={(e) => setActiveEventId(e.target.value)} className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer max-w-[150px] truncate">
          {seasonEvents.map(e => (<option key={e.id} value={e.id}>{e.name}</option>))}
        </select>
      </div>
      
      {setActiveSessionId && (
        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
          <Settings2 className="text-indigo-600" size={18} />
          <select value={activeSessionId} onChange={(e) => setActiveSessionId(e.target.value)} className="text-sm font-bold text-indigo-900 bg-transparent outline-none cursor-pointer max-w-[150px] truncate">
            {eventSessions.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Map className="text-gray-400" size={18} />
        <select value={activeDivisionId} onChange={(e) => setActiveDivisionId(e.target.value)} className="text-sm font-bold text-gray-700 bg-gray-100 outline-none border border-transparent focus:border-indigo-300 hover:bg-gray-200 px-3 py-1.5 rounded-lg cursor-pointer">
          {availableDivisions.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
        </select>
      </div>
    </div>
  );
}
