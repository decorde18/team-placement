import { getSeasons, getGlobalAgeGroups } from "@/app/actions/seasons";
import SeasonsManager from "./SeasonsManager";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export const metadata = {
  title: "Manage Seasons | Admin",
};

export default async function AdminSeasonsPage() {
  const seasons = await getSeasons();
  const globalAgeGroups = await getGlobalAgeGroups();
  const session = await getServerSession(authOptions);

  return (
    <div className="max-w-[1200px] mx-auto p-8 w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Seasons</h1>
          <p className="text-slate-500 mt-1">Manage seasons and configure age groups.</p>
        </div>
      </div>

      <SeasonsManager initialSeasons={seasons} globalAgeGroups={globalAgeGroups} />
    </div>
  );
}
