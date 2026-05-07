import { getUsers } from "@/app/actions/admin";
import UsersManager from "./UsersManager";

export const metadata = {
  title: "Manage Users | Admin",
};

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="max-w-[1200px] mx-auto p-8 w-full space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">Add, edit, and manage system access and roles.</p>
        </div>
      </div>

      <UsersManager initialUsers={users} />
    </div>
  );
}
