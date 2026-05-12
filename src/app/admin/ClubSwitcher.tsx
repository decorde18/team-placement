"use client";

import { useTransition } from "react";
import { setActiveClub } from "@/app/actions/clubs";

export default function ClubSwitcher({ 
  clubs, 
  activeClubId 
}: { 
  clubs: { id: number, name: string }[], 
  activeClubId: number | null 
}) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClubId = e.target.value;
    startTransition(() => {
      setActiveClub(newClubId);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Impersonate Club:</span>
      <select 
        value={activeClubId || ""}
        onChange={handleChange}
        disabled={isPending}
        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      >
        <option value="" disabled>Select Club...</option>
        {clubs.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
