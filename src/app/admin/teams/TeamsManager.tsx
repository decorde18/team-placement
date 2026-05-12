"use client";

import { useState, useTransition } from "react";
import { createSeason, createDivision, joinSeason, createTeam, assignCoach } from "@/app/actions/admin";

export default function TeamsManager({ seasons, joinedSeasonIds, divisions, teams, coaches }: any) {
  const [isPending, startTransition] = useTransition();
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  const [seasonForm, setSeasonForm] = useState({ name: "", startDate: "", endDate: "" });
  const [divForm, setDivForm] = useState({ ageGroupName: "", gender: "M", dobStart: "", dobEnd: "" });

  const handleCreateSeason = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const data = new FormData();
      data.append("name", seasonForm.name);
      data.append("startDate", seasonForm.startDate);
      data.append("endDate", seasonForm.endDate);
      await createSeason(data);
      setIsSeasonModalOpen(false);
      setSeasonForm({ name: "", startDate: "", endDate: "" });
    });
  };

  const handleCreateDivision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeasonId) return;
    startTransition(async () => {
      const data = new FormData();
      data.append("seasonId", activeSeasonId);
      data.append("ageGroupName", divForm.ageGroupName);
      data.append("gender", divForm.gender);
      data.append("dobStart", divForm.dobStart);
      data.append("dobEnd", divForm.dobEnd);
      await createDivision(data);
      setIsDivisionModalOpen(false);
      setDivForm({ ageGroupName: "", gender: "M", dobStart: "", dobEnd: "" });
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Global Seasons</h2>
          <p className="text-sm text-slate-500">Create new global seasons or join existing ones.</p>
        </div>
        <button 
          onClick={() => setIsSeasonModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Create Season
        </button>
      </div>

      {seasons.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
          No seasons found. Please create a global season first.
        </div>
      )}

      {seasons.map((season: any) => {
        const isJoined = joinedSeasonIds.includes(season.id);
        const seasonDivisions = divisions.filter((d: any) => d.season_id === season.id);

        return (
          <div key={season.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{season.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                </p>
              </div>
              {!isJoined ? (
                <form action={joinSeason}>
                  <input type="hidden" name="seasonId" value={season.id} />
                  <button type="submit" className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-200 transition-colors">
                    Join Season
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-1 rounded">Joined</span>
                  <button 
                    onClick={() => { setActiveSeasonId(season.id.toString()); setIsDivisionModalOpen(true); }}
                    className="text-sm bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors font-medium"
                  >
                    + Add Division
                  </button>
                </div>
              )}
            </div>
            
            {isJoined && (
              <div className="p-6 space-y-8">
                {seasonDivisions.length === 0 ? (
                  <p className="text-slate-500 italic">No age group divisions found for this season.</p>
                ) : null}

                {seasonDivisions.map((division: any) => {
                  const divisionTeams = teams.filter((t: any) => t.season_age_group_id === division.id);
                  
                  return (
                    <div key={division.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-indigo-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-semibold text-indigo-900">
                          {division.age_group_name} {division.gender}
                        </h3>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-medium">
                          {divisionTeams.length} Teams
                        </span>
                      </div>

                      <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* List Teams */}
                        {divisionTeams.map((team: any) => {
                          const assignedCoach = coaches.find((c: any) => c.assigned_team_id === team.id);

                          return (
                            <div key={team.id} className="border border-slate-200 rounded-md p-4 flex flex-col justify-between">
                              <div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">{team.name}</h4>
                                {assignedCoach ? (
                                  <p className="text-sm text-green-600 font-medium mb-3">Coach: {assignedCoach.name}</p>
                                ) : (
                                  <p className="text-sm text-amber-500 font-medium mb-3">No Coach Assigned</p>
                                )}
                              </div>
                              
                              <form action={assignCoach} className="mt-auto border-t border-slate-100 pt-3">
                                <input type="hidden" name="teamId" value={team.id} />
                                <div className="flex gap-2">
                                  <select 
                                    name="userId" 
                                    className="text-sm border border-slate-300 rounded px-2 py-1 flex-1 bg-white"
                                    defaultValue={assignedCoach ? assignedCoach.id : ""}
                                    required
                                  >
                                    <option value="" disabled>Select Coach...</option>
                                    {coaches.map((c: any) => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                  <button type="submit" className="bg-slate-800 text-white text-xs px-3 py-1 rounded hover:bg-slate-700 transition-colors">
                                    Set
                                  </button>
                                </div>
                              </form>
                            </div>
                          );
                        })}

                        {/* Create New Team Card */}
                        <div className="border border-dashed border-slate-300 bg-slate-50 rounded-md p-4 flex flex-col justify-center items-center">
                          <form action={createTeam} className="w-full">
                            <input type="hidden" name="season_age_group_id" value={division.id} />
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">Add Team</label>
                            <input 
                              type="text" 
                              name="name" 
                              required 
                              placeholder="e.g. Red Team" 
                              className="w-full text-sm border border-slate-300 rounded px-3 py-2 mb-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button type="submit" className="w-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium py-1.5 rounded transition-colors text-sm">
                              Create
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Global Season</h3>
            <form onSubmit={handleCreateSeason} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Season Name</label>
                <input type="text" required value={seasonForm.name} onChange={e => setSeasonForm({...seasonForm, name: e.target.value})} placeholder="e.g. Fall 2026" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" required value={seasonForm.startDate} onChange={e => setSeasonForm({...seasonForm, startDate: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" required value={seasonForm.endDate} onChange={e => setSeasonForm({...seasonForm, endDate: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsSeasonModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                <button type="submit" disabled={isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70">{isPending ? "Creating..." : "Create Season"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDivisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Division to Season</h3>
            <form onSubmit={handleCreateDivision} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age Group Name</label>
                <input type="text" required value={divForm.ageGroupName} onChange={e => setDivForm({...divForm, ageGroupName: e.target.value})} placeholder="e.g. U10, U12" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select value={divForm.gender} onChange={e => setDivForm({...divForm, gender: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="M">Boys</option>
                  <option value="F">Girls</option>
                  <option value="Coed">Coed</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">DOB Start</label>
                  <input type="date" required value={divForm.dobStart} onChange={e => setDivForm({...divForm, dobStart: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">DOB End</label>
                  <input type="date" required value={divForm.dobEnd} onChange={e => setDivForm({...divForm, dobEnd: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Supports standard year (1/1-12/31) and soccer year (8/1-7/31) formats.</p>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsDivisionModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                <button type="submit" disabled={isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70">{isPending ? "Adding..." : "Add Division"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
