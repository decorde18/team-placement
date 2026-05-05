"use client";

import React, { useEffect, useState } from 'react';
import { loadAppData, AppData, getHydratedPlayers } from '@/lib/mockData';

export default function PrintPage() {
  const [appData, setAppData] = useState<AppData | null>(null);

  useEffect(() => {
    setAppData(loadAppData());
  }, []);

  if (!appData) {
    return <div className="p-8 text-gray-500">Loading print view...</div>;
  }

  // Find the latest active session.
  const session = appData.sessions[appData.sessions.length - 1];
  if (!session) return <div className="p-8">No session found.</div>;

  const event = appData.events.find(e => e.id === session.eventId);
  if (!event) return <div className="p-8">Event for session not found.</div>;

  return (
    <div className="bg-white min-h-screen text-black p-8 print:p-0">
      <div className="print:hidden mb-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-indigo-900">Print Mode</h1>
          <p className="text-sm text-indigo-700">Press Ctrl+P (or Cmd+P) to print these sheets.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          Print Now
        </button>
      </div>

      {session.teams.map(team => {
        // Teams have divisionId now
        const division = appData.divisions.find(d => d.id === team.divisionId);
        
        // Hydrate players for this specific division and session
        const divPlayers = appData.globalPlayers.filter(gp => gp.divisionId === team.divisionId);
        const hydratedPlayers = getHydratedPlayers(divPlayers, session.sessionPlayers);
        
        const teamPlayers = hydratedPlayers.filter(p => p.teamId === team.id && p.status !== 'declined');
        if (teamPlayers.length === 0) return null;

        // We generate 3 tables side-by-side: Sorted by Number, Sorted by Name, Sorted by Rating
        const byNumber = [...teamPlayers].sort((a, b) => Number(a.tryoutNumber) - Number(b.tryoutNumber));
        const byName = [...teamPlayers].sort((a, b) => a.name.localeCompare(b.name));
        const byRating = [...teamPlayers].sort((a, b) => b.rating - a.rating);

        return (
          <div key={team.id} className="mb-12 page-break-after-always">
            <div className="border-b-2 border-black pb-2 mb-6">
              <h2 className="text-3xl font-black">{team.name}</h2>
              <p className="text-gray-600 font-bold">{division?.name} - {event.name} ({session.name}) ({teamPlayers.length} Players)</p>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {/* Table 1: By Number */}
              <div>
                <h3 className="font-bold text-lg mb-2 bg-gray-200 px-2 py-1">Sorted by Number</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-left">
                      <th className="py-1">#</th>
                      <th className="py-1">Name</th>
                      <th className="py-1 text-right">Rat.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byNumber.map(p => (
                      <tr key={p.id} className="border-b border-gray-300">
                        <td className="py-1 font-bold">{p.tryoutNumber}</td>
                        <td className="py-1">{p.name}</td>
                        <td className="py-1 text-right">{p.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table 2: By Name */}
              <div>
                <h3 className="font-bold text-lg mb-2 bg-gray-200 px-2 py-1">Sorted by Name</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-left">
                      <th className="py-1">Name</th>
                      <th className="py-1">#</th>
                      <th className="py-1 text-right">Rat.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byName.map(p => (
                      <tr key={p.id} className="border-b border-gray-300">
                        <td className="py-1 font-bold">{p.name}</td>
                        <td className="py-1">{p.tryoutNumber}</td>
                        <td className="py-1 text-right">{p.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table 3: By Rating */}
              <div>
                <h3 className="font-bold text-lg mb-2 bg-gray-200 px-2 py-1">Sorted by Rating</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-left">
                      <th className="py-1 text-right pr-4">Rat.</th>
                      <th className="py-1">Name</th>
                      <th className="py-1">#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRating.map(p => (
                      <tr key={p.id} className="border-b border-gray-300">
                        <td className="py-1 font-bold text-right pr-4">{p.rating}</td>
                        <td className="py-1">{p.name}</td>
                        <td className="py-1">{p.tryoutNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .page-break-after-always {
            page-break-after: always;
          }
        }
      `}} />
    </div>
  );
}
