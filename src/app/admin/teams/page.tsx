import { getSeasonsHierarchy, getUsers } from "@/app/actions/admin";
import TeamsManager from "./TeamsManager";

export default async function AdminTeamsPage() {
  const { seasons, joinedSeasonIds, divisions, teams } = await getSeasonsHierarchy();
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

      <TeamsManager 
        seasons={seasons} 
        joinedSeasonIds={joinedSeasonIds} 
        divisions={divisions} 
        teams={teams} 
        coaches={coaches} 
      />
    </div>
  );
}
