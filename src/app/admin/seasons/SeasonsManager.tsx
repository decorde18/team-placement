"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createSeason, updateSeason, deleteSeason } from "@/app/actions/seasons";
import { useRouter } from "next/navigation";

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
      router.refresh(); // Or optimistically update the state
      // For simplicity let's reload the page
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-800">Seasons List</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> New Season
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold border-b border-slate-200">Name</th>
              <th className="px-6 py-4 font-semibold border-b border-slate-200">Dates</th>
              <th className="px-6 py-4 font-semibold border-b border-slate-200">Age Groups</th>
              <th className="px-6 py-4 font-semibold border-b border-slate-200 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {seasons.map((season) => (
              <tr key={season.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{season.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600">
                    {season.start_date ? new Date(season.start_date).toLocaleDateString() : 'N/A'} - {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[300px]">
                    {season.seasonAgeGroups.map((sag: any) => (
                      <span key={sag.id} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md border border-indigo-100">
                        {sag.age_group_name} {sag.gender}
                      </span>
                    ))}
                    {season.seasonAgeGroups.length === 0 && <span className="text-slate-400 text-sm">None</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenModal(season)} className="text-slate-400 hover:text-indigo-600 p-2 transition-colors">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(season.id)} className="text-slate-400 hover:text-red-600 p-2 transition-colors ml-2">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {seasons.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No seasons found. Create one to get started.
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
              <h2 className="text-xl font-bold text-slate-900">{editingSeason ? "Edit Season" : "Create Season"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Season Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Fall 2026"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Age Groups & Genders in this Season</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {globalAgeGroups.map(ag => (
                      <React.Fragment key={ag.id}>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={formData.ageGroupIds.some(f => f.ageGroupId === ag.id && f.gender === 'M')}
                            onChange={() => toggleAgeGroup(ag.id, 'M')}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{ag.name} Boys (M)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={formData.ageGroupIds.some(f => f.ageGroupId === ag.id && f.gender === 'F')}
                            onChange={() => toggleAgeGroup(ag.id, 'F')}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{ag.name} Girls (F)</span>
                        </label>
                      </React.Fragment>
                    ))}
                  </div>
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
                  disabled={isSubmitting || !formData.name}
                  className="px-5 py-2.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : editingSeason ? "Save Changes" : "Create Season"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
