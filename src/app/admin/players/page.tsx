import { getSeasonsHierarchy } from "@/app/actions/admin";
import PlayersManager from "./PlayersManager";

export const metadata = {
  title: "Upload Players | Admin",
};

export default async function AdminPlayersPage() {
  const { divisions } = await getSeasonsHierarchy();

  return (
    <div className="max-w-[1200px] mx-auto p-8 w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Players Manager</h1>
          <p className="text-slate-500 mt-1">Bulk upload players via Excel or CSV files.</p>
        </div>
      </div>

      <PlayersManager divisions={divisions} />
    </div>
  );
}
