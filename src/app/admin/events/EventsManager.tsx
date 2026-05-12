"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/events";
import { useRouter } from "next/navigation";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";

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
    <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden text-[var(--card-foreground)]">
      <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--muted)]/30">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Events List</h2>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} /> New Event
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)]">Name</th>
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)]">Season</th>
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)]">Type</th>
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)]">Age Groups (Divisions)</th>
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-[var(--foreground)]">{event.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[var(--muted-foreground)]">{event.season_name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-md border ${event.event_type === 'tryout' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}`}>
                    {event.event_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[300px]">
                    {event.divisions.map((div: any) => (
                      <span key={div.id} className="px-2 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] text-xs rounded-md border border-[var(--border)]">
                        {div.name}
                      </span>
                    ))}
                    {event.divisions.length === 0 && <span className="text-[var(--muted-foreground)] text-sm">None</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal(event)} className="text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                    <Edit2 size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]">
                    <Trash2 size={18} />
                  </Button>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[var(--muted-foreground)]">
                  No events found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEvent ? "Edit Event" : "Create Event"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">Event Name</label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Spring 2026 Tryouts"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">Season</label>
              <Select
                required
                value={formData.season_id}
                onChange={(e) => {
                  setFormData({ ...formData, season_id: e.target.value, divisionIds: [] }); // Reset divisions when season changes
                }}
              >
                <option value="" disabled>Select a season</option>
                {seasonsData.seasons.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">Event Type</label>
              <Select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              >
                <option value="tryout">Tryout</option>
                <option value="ranking">Ranking</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Age Groups (Divisions) in this Event</label>
            {formData.season_id ? (
              <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {availableDivisions.map(div => (
                  <label key={div.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--accent)] p-1.5 rounded text-[var(--foreground)]">
                    <Checkbox
                      checked={formData.divisionIds.includes(div.id)}
                      onChange={() => toggleDivision(div.id)}
                    />
                    <span>{div.name}</span>
                  </label>
                ))}
                {availableDivisions.length === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)] col-span-full">No age groups found for this season. Configure age groups in the Seasons manager.</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)] italic border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)]/50">
                Please select a season first to see available age groups.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.season_id}
            >
              {isSubmitting ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
