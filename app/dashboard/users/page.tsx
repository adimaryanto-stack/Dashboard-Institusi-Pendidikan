'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { usersData } from '@/lib/data';
import { User, UserRole } from '@/types';
import { Search, Plus, Edit3, Trash2, Shield, ShieldCheck, Eye, UserCheck, UserX } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const roleConfig: Record<UserRole, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  ADMIN: { label: 'Admin', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  ADMIN_PROVINSI: { label: 'Admin Provinsi', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  ADMIN_KABKOTA: { label: 'Admin Kab/Kota', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  VIEWER: { label: 'Viewer', color: 'bg-gray-100 text-gray-600 border-gray-300' },
  AUDITOR: { label: 'Auditor', color: 'bg-amber-100 text-amber-700 border-amber-300' },
};

export default function UsersPage() {
  const { dbData, isSupabaseMode, setDbData } = useAppStore();
  const [data, setData] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  useEffect(() => {
    setData(isSupabaseMode && dbData ? dbData.users : usersData);
  }, [dbData, isSupabaseMode]);

  // Form state
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('VIEWER');

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      roleConfig[u.role].label.toLowerCase().includes(q)
    );
  }, [data, search]);

  const openAddModal = () => {
    setEditUser(null);
    setFormUsername('');
    setFormEmail('');
    setFormRole('VIEWER');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormRole(user.role);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formUsername || !formEmail) return;

    if (editUser) {
      const updatedUser = { ...editUser, username: formUsername, email: formEmail, role: formRole };
      setData(prev => prev.map(u => u.id === editUser.id ? updatedUser : u));
      if (isSupabaseMode && dbData) {
        const updatedUsers = dbData.users.map((u: any) => u.id === editUser.id ? updatedUser : u);
        setDbData({ ...dbData, users: updatedUsers });
        supabase
          .from('users')
          .update({ username: formUsername, email: formEmail, role: formRole })
          .eq('id', editUser.id)
          .then(({ error }) => {
            if (error) console.error('Failed to update user in Supabase:', error.message);
          });
      }
    } else {
      const newUser: User = {
        id: `u-manual-${Date.now()}`,
        username: formUsername,
        email: formEmail,
        role: formRole,
        is_active: true,
        created_at: new Date().toISOString(),
        institusi_id: 'inst-sd-0'
      };
      setData(prev => [...prev, newUser]);
      if (isSupabaseMode && dbData) {
        setDbData({ ...dbData, users: [...dbData.users, newUser] });
        supabase
          .from('users')
          .insert([newUser])
          .then(({ error }) => {
            if (error) console.error('Failed to insert user to Supabase:', error.message);
          });
      }
    }
    setShowModal(false);
  };

  const handleToggleActive = (id: string) => {
    const user = data.find(u => u.id === id);
    if (!user || user.role === 'SUPER_ADMIN') return;
    const newActiveState = !user.is_active;
    setData(prev => prev.map(u => u.id === id ? { ...u, is_active: newActiveState } : u));
    if (isSupabaseMode && dbData) {
      const updatedUsers = dbData.users.map((u: any) => u.id === id ? { ...u, is_active: newActiveState } : u);
      setDbData({ ...dbData, users: updatedUsers });
      supabase
        .from('users')
        .update({ is_active: newActiveState })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Failed to toggle active user in Supabase:', error.message);
        });
    }
  };

  const handleDelete = (id: string) => {
    const user = data.find(u => u.id === id);
    if (!user || user.role === 'SUPER_ADMIN') { alert('Super Admin tidak bisa dihapus!'); return; }
    if (!confirm('Hapus user ini?')) return;
    setData(prev => prev.filter(u => u.id !== id));
    if (isSupabaseMode && dbData) {
      const updatedUsers = dbData.users.filter((u: any) => u.id !== id);
      setDbData({ ...dbData, users: updatedUsers });
      supabase
        .from('users')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Failed to delete user in Supabase:', error.message);
        });
    }
  };

  const getInitials = (name: string) => {
    return name.split('.').map(s => s[0]?.toUpperCase()).join('').slice(0, 2);
  };

  return (
    <div className="min-h-screen">
      <Header title="User Manager" subtitle="Kelola pengguna dan hak akses sistem" showYearSelector={false} showSearch={false} />

      <div className="p-6">
        {/* Toolbar */}
        <div className="sheet-toolbar">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari user, email, atau role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <span className="text-xs text-text-muted flex-1">{filtered.length} users</span>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={14} />
            Tambah User
          </button>
        </div>

        {/* Table */}
        <div className="sheet-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 200 }}>User</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 220 }}>Email</th>
                <th className="sheet-header-cell text-center" style={{ minWidth: 140 }}>Role</th>
                <th className="sheet-header-cell text-center" style={{ width: 100 }}>Status</th>
                <th className="sheet-header-cell text-center" style={{ width: 140 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, idx) => (
                <tr key={user.id} className="hover:bg-indigo-50/50 transition">
                  <td className="sheet-cell text-center text-text-muted text-xs">{idx + 1}</td>
                  <td className="sheet-cell text-left">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.is_active ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {getInitials(user.username)}
                      </div>
                      <span className="font-medium text-text-primary">{user.username}</span>
                      {user.institusi_id === 'inst-sd-0' && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium ml-2">SDN 01 Menteng</span>
                      )}
                    </div>
                  </td>
                  <td className="sheet-cell text-left text-text-secondary text-xs">{user.email}</td>
                  <td className="sheet-cell text-center">
                    <span className={`badge ${roleConfig[user.role].color}`}>
                      {roleConfig[user.role].label}
                    </span>
                  </td>
                  <td className="sheet-cell text-center">
                    <span className={`badge ${user.is_active 
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                      : 'bg-rose-100 text-rose-700 border-rose-300'}`}
                    >
                      {user.is_active ? '✓ Aktif' : '✗ Non-aktif'}
                    </span>
                  </td>
                  <td className="sheet-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="btn btn-ghost py-1 px-2 text-xs"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className="btn btn-ghost py-1 px-2 text-xs"
                        title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        disabled={user.role === 'SUPER_ADMIN'}
                      >
                        {user.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-ghost py-1 px-2 text-xs text-rose-500"
                        title="Hapus"
                        disabled={user.role === 'SUPER_ADMIN'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-4">
              {editUser ? 'Edit User' : 'Tambah User Baru'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Username</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="john.doe"
                  className="search-input w-full pl-3"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="john@institusi.go.id"
                  className="search-input w-full pl-3"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="select-dropdown w-full"
                >
                  {(Object.keys(roleConfig) as UserRole[]).map(role => (
                    <option key={role} value={role}>{roleConfig[role].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowModal(false)} className="btn btn-ghost">Batal</button>
                <button onClick={handleSave} className="btn btn-primary">
                  {editUser ? 'Simpan Perubahan' : 'Tambah User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
