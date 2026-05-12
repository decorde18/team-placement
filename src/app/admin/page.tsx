import { getDashboardStats } from "@/app/actions/admin";
import { Users, Trophy, Calendar, Layers, ArrowRight, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Admin Dashboard | Team Placement",
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { title: "Players", value: stats.players, icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/admin/players" },
    { title: "Teams", value: stats.teams, icon: Trophy, color: "text-purple-600", bg: "bg-purple-50", link: "/admin/teams" },
    { title: "Events", value: stats.events, icon: Calendar, color: "text-orange-600", bg: "bg-orange-50", link: "/admin/events" },
    { title: "Seasons", value: stats.seasons, icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50", link: "/admin/seasons" },
  ];

  const quickActions = [
    { title: "New Season", description: "Create a global season and opt-in", link: "/admin/seasons", icon: PlusCircle },
    { title: "New Event", description: "Set up tryouts or ranking events", link: "/admin/events", icon: PlusCircle },
    { title: "Manage Age Groups", description: "Configure birth year ranges", link: "/admin/age-groups", icon: PlusCircle },
    { title: "Import Players", description: "Bulk upload from CSV/Excel", link: "/admin/players", icon: PlusCircle },
  ];

  return (
    <div className="max-w-[1200px] mx-auto p-8 w-full space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your club's operations and quick access to management tools.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Link key={card.title} href={card.link}>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>
                  <card.icon size={24} />
                </div>
                <ArrowRight size={18} className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{card.value}</h3>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle size={20} className="text-indigo-600" /> Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.link} className="block">
                <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-start gap-4">
                  <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                    <action.icon size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{action.title}</h4>
                    <p className="text-sm text-slate-500 mt-1">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity / Info */}
        <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 space-y-4 shadow-lg">
          <h2 className="text-xl font-bold text-white">System Status</h2>
          <div className="space-y-4 mt-6">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm">Database</span>
              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Connected
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm">Active Club</span>
              <span className="text-white text-xs font-bold">Isolated Context</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-sm">Server Mode</span>
              <span className="text-indigo-400 text-xs font-bold">Production-Ready</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-8 italic leading-relaxed">
            All administrative actions are logged and isolated to your current club context. Ensure you have the correct club selected in the top switcher.
          </p>
        </div>
      </div>
    </div>
  );
}