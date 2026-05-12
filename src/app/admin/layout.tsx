import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { getClubs, getActiveClubId } from "@/app/actions/clubs";
import ClubSwitcher from "./ClubSwitcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // If not logged in, or if logged in but not an admin (system_admin or club_admin), boot them to the homepage
  const role = (session?.user as any)?.role;
  if (!session || (role !== 'system_admin' && role !== 'club_admin')) {
    redirect("/");
  }

  let clubs: {id: number, name: string}[] = [];
  let activeClubId = null;

  if (role === 'system_admin') {
    clubs = await getClubs();
    activeClubId = await getActiveClubId();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-slate-300 py-3 px-6 text-sm font-medium border-b border-slate-800 flex justify-between items-center">
        <div>
          <span className="text-white mr-4">🔒 Admin Control Panel</span>
          <a href="/admin/users" className="mr-4 hover:text-white transition-colors">Users</a>
          <a href="/admin/teams" className="mr-4 hover:text-white transition-colors">Teams</a>
          <a href="/admin/players" className="mr-4 hover:text-white transition-colors">Players</a>
          {role === 'system_admin' && (
            <a href="/admin/clubs" className="hover:text-white transition-colors">Clubs</a>
          )}
        </div>
        <div className="flex items-center gap-6">
          {role === 'system_admin' && (
             <ClubSwitcher clubs={clubs} activeClubId={activeClubId} />
          )}
          <span>
            Welcome, {session.user?.name}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
