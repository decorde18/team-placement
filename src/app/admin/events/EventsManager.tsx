"use client";

import React, { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Calendar, ChevronDown, ChevronRight, Loader2, Clock, RefreshCw, Check, X } from "lucide-react";
import { createEvent, updateEvent, deleteEvent, getSessions, createSession, updateSession, deleteSession, refreshEventPlayers } from "@/app/actions/events";
import { useRouter } from "next/navigation";

export default function EventsManager({ initialEvents, seasonsData }: { initialEvents: any[], seasonsData: { seasons: any[], divisions: any[] } }) {
  const [events, setEvents] = useState(initialEvents);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [eventSessions, setEventSessions] = useState<{ [key: number]: any[] }>({});
  const [loadingSessions, setLoadingSessions] = useState<{ [key: number]: boolean }>({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  
  // To handle the form
  const [formData, setFormData] = useState({ name: "", season_id: "", event_type: "tryout", divisionIds: [] as number[] });
  const [sessionFormData, setSessionFormData] = useState({ name: "", session_date: "" });
  
  const [isPending, startTransition] = useTransition();
  const [syncingEventId, setSyncingEventId] = useState<number | null>(null);
  const [syncSuccessId, setSyncSuccessId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'name', direction: 'asc' });
  const router = useRouter();

  // Get divisions for the currently selected season in the form
  const availableDivisions = seasonsData.divisions.filter(d => d.season_id === parseInt(formData.season_id));

  const handleRefreshPlayers = (eventId: number) => {
    setSyncingEventId(eventId);
    startTransition(async () => {
      try {
        await refreshEventPlayers(eventId);
        setSyncSuccessId(eventId);
        setTimeout(() => setSyncSuccessId(null), 3000);
      } catch (error) {
        console.error(error);
        alert("Failed to sync players");
      } finally {
        setSyncingEventId(null);
      }
    });
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
        direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortedEvents = (items: any[]) => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle nested or special cases if needed (e.g., season_name)
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedEvents = getSortedEvents(events);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ChevronDown size={14} className="opacity-0 group-hover:opacity-40" />;
    return sortConfig.direction === 'asc' ? <ChevronDown size={14} className="text-indigo-600 rotate-180 transition-transform" /> : <ChevronDown size={14} className="text-indigo-600 transition-transform" />;
  };

  const handleOpenModal = (event?: any) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        season_id: event.season_id.toString(),
        event_type: event.event_type,
        divisionIds: event.divisions.map((d: any) => d.id)
      });
    } else {
      setEditingEvent(null);
      const defaultSeason = seasonsData.seasons.length > 0 ? seasonsData.seasons[0].id.toString() : "";
      setFormData({ name: "", season_id: defaultSeason, event_type: "tryout", divisionIds: [] });
    }
    setIsModalOpen(true);
  };

  const handleOpenSessionModal = (eventId: number, session?: any) => {
    setActiveEventId(eventId);
    if (session) {
      setEditingSession(session);
      setSessionFormData({
        name: session.name,
        session_date: session.session_date ? new Date(session.session_date).toISOString().split('T')[0] : "",
      });
    } else {
      setEditingSession(null);
      setSessionFormData({ name: "", session_date: new Date().toISOString().split('T')[0] });
    }
    setIsSessionModalOpen(true);
  };

  const toggleDivision = (divId: number) => {
    setFormData(prev => {
      if (prev.divisionIds.includes(divId)) {
        return { ...prev, divisionIds: prev.divisionIds.filter(id => id !== divId) };
      } else {
        return { ...prev, divisionIds: [...prev.divisionIds, divId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          name: formData.name,
          season_id: parseInt(formData.season_id),
          event_type: formData.event_type,
          divisionIds: formData.divisionIds
        };

        if (editingEvent) {
          await updateEvent(editingEvent.id, payload);
        } else {
          await createEvent(payload);
        }
        setIsModalOpen(false);
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert("An error occurred");
      }
    });
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId) return;
    startTransition(async () => {
      try {
        if (editingSession) {
          await updateSession(editingSession.id, sessionFormData);
        } else {
          await createSession({ ...sessionFormData, event_id: activeEventId });
        }
        setIsSessionModalOpen(false);
        // Reload sessions for this event
        const sessions = await getSessions(activeEventId);
        setEventSessions(prev => ({ ...prev, [activeEventId]: sessions }));
      } catch (error) {
        console.error(error);
        alert("An error occurred");
      }
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this event? This will also delete any division mappings for this event.")) {
      startTransition(async () => {
        try {
          await deleteEvent(id);
          window.location.reload();
        } catch (error) {
          console.error(error);
          alert("Failed to delete event");
        }
      });
    }
  };

  const handleDeleteSession = async (eventId: number, sessionId: number) => {
    if (confirm("Are you sure you want to delete this session?")) {
      startTransition(async () => {
        try {
          await deleteSession(sessionId);
          const sessions = await getSessions(eventId);
          setEventSessions(prev => ({ ...prev, [eventId]: sessions }));
        } catch (error) {
          console.error(error);
          alert("Failed to delete session");
        }
      });
    }
  };

  const toggleExpandEvent = async (eventId: number) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventId);
      if (!eventSessions[eventId]) {
        setLoadingSessions(prev => ({ ...prev, [eventId]: true }));
        try {
          const sessions = await getSessions(eventId);
          setEventSessions(prev => ({ ...prev, [eventId]: sessions }));
        } finally {
          setLoadingSessions(prev => ({ ...prev, [eventId]: false }));
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Events List</h2>
          <p className="text-sm text-slate-500 mt-1">Manage tryouts and ranking events.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
              <th className="px-6 py-4 font-semibold w-10"></th>
              <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-2">Name <SortIcon column="name" /></div>
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => requestSort('season_name')}>
                <div className="flex items-center gap-2">Season <SortIcon column="season_name" /></div>
              </th>
              <th className="px-6 py-4 font-semibold cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => requestSort('event_type')}>
                <div className="flex items-center gap-2">Type <SortIcon column="event_type" /></div>
              </th>
              <th className="px-6 py-4 font-semibold">Age Groups (Divisions)</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedEvents.map((event) => (
              <React.Fragment key={event.id}>
                <tr className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <button onClick={() => toggleExpandEvent(event.id)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                      {expandedEvent === event.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{event.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600">{event.season_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                      event.event_type === 'tryout' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {event.event_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                      {event.divisions.map((div: any) => (
                        <span key={div.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200">
                          {div.name}
                        </span>
                      ))}
                      {event.divisions.length === 0 && <span className="text-slate-400 italic">None</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRefreshPlayers(event.id)} 
                        title="Sync Players"
                        className={`transition-colors ${syncSuccessId === event.id ? 'text-green-600 font-bold' : 'text-slate-500 hover:text-indigo-600'}`}
                        disabled={syncingEventId === event.id}
                      >
                        {syncingEventId === event.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : syncSuccessId === event.id ? (
                          <Check size={16} />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                      </button>
                      <button 
                        onClick={() => handleOpenModal(event)} 
                        className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(event.id)} 
                        className="text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedEvent === event.id && (
                  <tr className="bg-slate-50/30">
                    <td colSpan={6} className="px-12 py-6">
                      <div className="border-l-2 border-indigo-200 pl-6 py-2">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Clock size={14} /> Sessions for {event.name}
                          </h3>
                          <button 
                            onClick={() => handleOpenSessionModal(event.id)} 
                            className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <Plus size={14} /> Add Session
                          </button>
                        </div>
                        
                        {loadingSessions[event.id] ? (
                          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                            <Loader2 size={16} className="animate-spin text-indigo-600" /> Loading sessions...
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {eventSessions[event.id]?.map((session: any) => (
                              <div key={session.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center group shadow-sm hover:border-indigo-300 transition-colors">
                                <div>
                                  <p className="font-bold text-slate-900">{session.name}</p>
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1.5 font-medium">
                                    <Calendar size={12} /> {session.session_date ? new Date(session.session_date).toLocaleDateString() : 'No date'}
                                  </p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenSessionModal(event.id, session)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteSession(event.id, session.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(!eventSessions[event.id] || eventSessions[event.id].length === 0) && (
                              <p className="text-sm text-slate-400 italic py-2 col-span-full">No sessions found for this event. Create one to start tracking evaluations.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No events found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Event Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden transform scale-100 opacity-100 transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEvent ? "Edit Event" : "Create New Event"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Spring 2026 Tryouts"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Season</label>
                  <select
                    required
                    value={formData.season_id}
                    onChange={(e) => {
                      setFormData({ ...formData, season_id: e.target.value, divisionIds: [] }); // Reset divisions when season changes
                    }}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="" disabled>Select a season</option>
                    {seasonsData.seasons.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="tryout">Tryout</option>
                    <option value="ranking">Ranking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Age Groups (Divisions) in this Event</label>
                {formData.season_id ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto shadow-inner">
                    {availableDivisions.map(div => (
                      <label key={div.id} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-white p-2 rounded-lg text-slate-700 border border-transparent hover:border-slate-200 hover:shadow-sm transition-all group">
                        <input
                          type="checkbox"
                          checked={formData.divisionIds.includes(div.id)}
                          onChange={() => toggleDivision(div.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="group-hover:text-slate-900 transition-colors">{div.name}</span>
                      </label>
                    ))}
                    {availableDivisions.length === 0 && (
                      <p className="text-sm text-slate-400 col-span-full italic py-2 text-center">No age groups found for this season. Configure age groups in the Seasons manager.</p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 italic border border-slate-200 rounded-xl p-6 bg-slate-50 text-center">
                    Please select a season first to see available age groups.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formData.name || !formData.season_id}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm active:scale-95"
                >
                  {isPending ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Modal - THE ONE YOU MENTIONED */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform scale-100 opacity-100 transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSession ? "Edit Session" : "Create New Session"}
              </h3>
              <button onClick={() => setIsSessionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSessionSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Session Name</label>
                <input
                  type="text"
                  required
                  value={sessionFormData.name}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, name: e.target.value })}
                  placeholder="e.g. Day 1, Scrimmage, Evaluation"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Session Date</label>
                <input
                  type="date"
                  required
                  value={sessionFormData.session_date}
                  onChange={(e) => setSessionFormData({ ...sessionFormData, session_date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !sessionFormData.name || !sessionFormData.session_date}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingSession ? "Save Changes" : "Create Session"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
