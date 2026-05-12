"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/events";
import { useRouter } from "next/navigation";

export default function EventsManager({ initialEvents, seasonsData }: { initialEvents: any[], seasonsData: { seasons: any[], divisions: any[] } }) {
  const [events, setEvents] = useState(initialEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  // To handle the form
  const [formData, setFormData] = useState({ name: "", season_id: "", event_type: "tryout", divisionIds: [] as number[] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Get divisions for the currently selected season in the form
  const availableDivisions = seasonsData.divisions.filter(d => d.season_id === parseInt(formData.season_id));

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
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this event? This will also delete any division mappings for this event.")) {
      try {
        await deleteEvent(id);
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert("Failed to delete event");
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-800">Events List</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold border-b border-slate-200">Name</th>
              <th className="px-6 py-4 font-semibold border-b border-slate-200">Season</th>
              <th className="px-6 py-4 font-semibold border-b border-slate-200">Type</th>
              <th className="px-6 py-4 font-semibold border-b border-slate-200">Age Groups (Divisions)</th>
              <th className="px-6 py-4 font-semibold border-b border-slate-200 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{event.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600">{event.season_name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-md border ${event.event_type === 'tryout' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                    {event.event_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[300px]">
                    {event.divisions.map((div: any) => (
                      <span key={div.id} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                        {div.name}
                      </span>
                    ))}
                    {event.divisions.length === 0 && <span className="text-slate-400 text-sm">None</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenModal(event)} className="text-slate-400 hover:text-indigo-600 p-2 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors ml-2">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No events found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingEvent ? "Edit Event" : "Create Event"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Spring 2026 Tryouts"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Season</label>
                    <select
                      required
                      value={formData.season_id}
                      onChange={(e) => {
                        setFormData({ ...formData, season_id: e.target.value, divisionIds: [] }); // Reset divisions when season changes
                      }}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                    >
                      <option value="" disabled>Select a season</option>
                      {seasonsData.seasons.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Event Type</label>
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                    >
                      <option value="tryout">Tryout</option>
                      <option value="ranking">Ranking</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Age Groups (Divisions) in this Event</label>
                  {formData.season_id ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      {availableDivisions.map(div => (
                        <label key={div.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={formData.divisionIds.includes(div.id)}
                            onChange={() => toggleDivision(div.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{div.name}</span>
                        </label>
                      ))}
                      {availableDivisions.length === 0 && (
                        <p className="text-sm text-slate-500 col-span-full">No age groups found for this season. Configure age groups in the Seasons manager.</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic border border-slate-200 rounded-lg p-4 bg-slate-50">
                      Please select a season first to see available age groups.
                    </div>
                  )}
                </div>

              </div>
              
              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.season_id}
                  className="px-5 py-2.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
