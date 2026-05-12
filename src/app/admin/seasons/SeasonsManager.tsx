"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createSeason, updateSeason, deleteSeason } from "@/app/actions/seasons";
import { useRouter } from "next/navigation";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Checkbox } from "@/components/ui/checkbox";

export default function SeasonsManager({ initialSeasons, globalAgeGroups }: { initialSeasons: any[], globalAgeGroups: any[] }) {
  const [seasons, setSeasons] = useState(initialSeasons);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", start_date: "", end_date: "", ageGroupIds: [] as { ageGroupId: number, gender: string }[] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleOpenModal = (season?: any) => {
    if (season) {
      setEditingSeason(season);
      setFormData({
        name: season.name,
        start_date: season.start_date ? new Date(season.start_date).toISOString().split('T')[0] : "",
        end_date: season.end_date ? new Date(season.end_date).toISOString().split('T')[0] : "",
        ageGroupIds: season.seasonAgeGroups.map((sag: any) => ({ ageGroupId: sag.age_group_id, gender: sag.gender }))
      });
    } else {
      setEditingSeason(null);
      setFormData({ name: "", start_date: "", end_date: "", ageGroupIds: [] });
    }
    setIsModalOpen(true);
  };

  const toggleAgeGroup = (ageGroupId: number, gender: string) => {
    setFormData(prev => {
      const exists = prev.ageGroupIds.some(ag => ag.ageGroupId === ageGroupId && ag.gender === gender);
      if (exists) {
        return { ...prev, ageGroupIds: prev.ageGroupIds.filter(ag => !(ag.ageGroupId === ageGroupId && ag.gender === gender)) };
      } else {
        return { ...prev, ageGroupIds: [...prev.ageGroupIds, { ageGroupId, gender }] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSeason) {
        await updateSeason(editingSeason.id, formData);
      } else {
        await createSeason(formData);
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
    if (confirm("Are you sure you want to delete this season? This may fail if it is linked to existing events or players.")) {
      try {
        await deleteSeason(id);
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert("Failed to delete season");
      }
    }
  };

  return (
    <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden text-[var(--card-foreground)]">
      <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--muted)]/30">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Seasons List</h2>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={16} /> New Season
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--muted)]/50 text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)]">Name</th>
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)]">Dates</th>
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)]">Age Groups</th>
              <th className="px-6 py-4 font-semibold border-b border-[var(--border)] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {seasons.map((season) => (
              <tr key={season.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-[var(--foreground)]">{season.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {season.start_date ? new Date(season.start_date).toLocaleDateString() : 'N/A'} - {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[300px]">
                    {season.seasonAgeGroups.map((sag: any) => (
                      <span key={sag.id} className="px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs rounded-md border border-[var(--primary)]/20">
                        {sag.age_group_name} {sag.gender}
                      </span>
                    ))}
                    {season.seasonAgeGroups.length === 0 && <span className="text-[var(--muted-foreground)] text-sm">None</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal(season)} className="text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                    <Edit2 size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(season.id)} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]">
                    <Trash2 size={18} />
                  </Button>
                </td>
              </tr>
            ))}
            {seasons.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[var(--muted-foreground)]">
                  No seasons found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingSeason ? "Edit Season" : "Create Season"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">Season Name</label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Fall 2026"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">Start Date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">End Date</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Age Groups & Genders in this Season</label>
            <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
              {globalAgeGroups.map(ag => (
                <React.Fragment key={ag.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--accent)] p-1.5 rounded text-[var(--foreground)]">
                    <Checkbox
                      checked={formData.ageGroupIds.some(f => f.ageGroupId === ag.id && f.gender === 'M')}
                      onChange={() => toggleAgeGroup(ag.id, 'M')}
                    />
                    <span>{ag.name} Boys (M)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--accent)] p-1.5 rounded text-[var(--foreground)]">
                    <Checkbox
                      checked={formData.ageGroupIds.some(f => f.ageGroupId === ag.id && f.gender === 'F')}
                      onChange={() => toggleAgeGroup(ag.id, 'F')}
                    />
                    <span>{ag.name} Girls (F)</span>
                  </label>
                </React.Fragment>
              ))}
            </div>
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
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? "Saving..." : editingSeason ? "Save Changes" : "Create Season"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
