"use client";

import { useState, useTransition } from "react";
import { createUser, updateUser, deleteUser } from "@/app/actions/admin";

export default function UsersManager({ initialUsers, currentUserRole }: { initialUsers: any[], currentUserRole: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "coach",
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "coach" });
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // empty so they only change it if they want
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (user: any) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const data = new FormData();
        data.append("name", formData.name);
        data.append("email", formData.email);
        data.append("role", formData.role);
        
        if (editingUser) {
          data.append("id", editingUser.id.toString());
          if (formData.password) data.append("password", formData.password);
          await updateUser(data);
          
          // Optimistic UI update
          setUsers(users.map(u => u.id === editingUser.id ? { 
            ...u, 
            name: formData.name, 
            email: formData.email, 
            role: formData.role 
          } : u));
        } else {
          data.append("password", formData.password);
          await createUser(data);
          // Just reload to get new users (Next.js server action revalidation will refresh server component)
          // But since we are managing state locally we might just do a location.reload() or let the parent prop update.
          // Since the parent page is server-rendered, the revalidatePath in action will refresh the page.
          window.location.reload();
        }
        setIsModalOpen(false);
      } catch (error) {
        console.error("Failed to save user:", error);
        alert("An error occurred while saving.");
      }
    });
  };

  const handleDelete = () => {
    if (!userToDelete) return;
    startTransition(async () => {
      try {
        const data = new FormData();
        data.append("id", userToDelete.id.toString());
        await deleteUser(data);
        
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setDeleteModalOpen(false);
      } catch (error) {
        console.error("Failed to delete user:", error);
        alert("An error occurred while deleting.");
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header section */}
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">All Users</h2>
          <p className="text-sm text-slate-500 mt-1">Manage system administrators and coaches.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 shadow-sm"
        >
          <span>+</span> Add New User
        </button>
      </div>

      {/* Table section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/50 text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Assigned Team</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : null}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    user.role === 'system_admin' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : user.role === 'club_admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {user.team_name ? (
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium border border-indigo-100">
                      {user.team_name}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(user)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => openDeleteModal(user)}
                      className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform scale-100 opacity-100 transition-all">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? "Edit User" : "Add New User"}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name}
                  onChange={handleFormChange}
                  required 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email}
                  onChange={handleFormChange}
                  required 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password {editingUser && <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password}
                  onChange={handleFormChange}
                  required={!editingUser} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder={editingUser ? "••••••••" : "Create a password"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select 
                  name="role" 
                  value={formData.role}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                >
                  <option value="coach">Coach</option>
                  <option value="club_admin">Club Admin</option>
                  {currentUserRole === 'system_admin' && (
                    <option value="system_admin">System Admin</option>
                  )}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                >
                  {isPending ? "Saving..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete User?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-700">{userToDelete.name}</span>? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
