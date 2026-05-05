import { getSeasonsHierarchy, createTeam, assignCoach, getUsers } from "@/app/actions/admin";

export default async function AdminTeamsPage() {
  const { seasons, divisions, teams } = await getSeasonsHierarchy();
  const users = await getUsers();
  const coaches = users.filter((u: any) => u.role === 'coach');

  return (
    <div className="max-w-[1200px] mx-auto p-8 w-full space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Teams & Assignments</h1>
          <p className="text-slate-500 mt-1">Manage divisions, create teams, and assign coaches.</p>
        </div>
        <a href="/admin/users" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-medium hover:bg-slate-200 transition-colors">
          &larr; Back to Users
        </a>
      </div>

      {seasons.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md">
          No seasons found. Please add a season and age groups to your database first!
        </div>
      )}

      {seasons.map((season: any) => {
        // Find divisions for this season
        const seasonDivisions = divisions.filter((d: any) => d.season_id === season.id);

        return (
          <div key={season.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{season.name}</h2>
            </div>
            
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
                            
                            {/* Assign Coach Form */}
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
          </div>
        );
      })}
    </div>
  );
}
