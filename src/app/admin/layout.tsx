import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // If not logged in, or if logged in but not an admin, boot them to the homepage
  if (!session || (session.user as any)?.role !== 'admin') {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-slate-300 py-3 px-6 text-sm font-medium border-b border-slate-800 flex justify-between items-center">
        <div>
          <span className="text-white mr-4">🔒 Admin Control Panel</span>
          <a href="/admin/users" className="mr-4 hover:text-white transition-colors">Users</a>
          <a href="/admin/teams" className="hover:text-white transition-colors">Teams</a>
        </div>
        <div>
          Welcome, {session.user?.name}
        </div>
      </div>
      {children}
    </div>
  );
}
