"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Plus, Pencil, KeyRound, Ban, CheckCircle2, Trash2, AlertTriangle, Camera, LoaderCircle } from "lucide-react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import SettingsTabs from "@/components/layout/SettingsTabs";
import {
  Role,
  ROLE_LABELS,
  hashPassword,
  getVisibleRoles,
  getManageableRoles,
  canEditUser,
  canSuspend,
  canDelete,
  canResetPassword,
  isNeverUsed,
} from "@/lib/auth";

interface ManagedUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: Role;
  status: "active" | "suspended";
  last_login_at: string | null;
  avatar_url: string | null;
}

export default function ManajemenUserPage() {
  const { user: actor } = useAuth();
  const actorRole = actor?.role;

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTER & SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("Semua Role");
  const [filterStatus, setFilterStatus] = useState("Semua Status");

  // --- MODAL: TAMBAH / EDIT ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState({ name: "", username: "", email: "", role: "operator" as Role, password: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // --- FOTO PROFIL (opsional, di form Tambah/Edit) ---
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // --- MODAL: SUSPEND / AKTIFKAN ---
  const [suspendTarget, setSuspendTarget] = useState<ManagedUser | null>(null);

  // --- MODAL: DELETE PERMANEN ---
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  // --- MODAL: RESET PASSWORD ---
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 2500);
  };

  const visibleRoles = actorRole ? getVisibleRoles(actorRole) : [];
  const manageableRoles = actorRole ? getManageableRoles(actorRole) : [];

  const fetchUsers = async () => {
    if (!actorRole) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("users")
      .select("id, username, name, email, role, status, last_login_at, avatar_url")
      .in("role", visibleRoles.length > 0 ? visibleRoles : ["__none__"])
      .order("created_at", { ascending: true });

    if (!error && data) setUsers(data as ManagedUser[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorRole]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "Semua Role" || u.role === filterRole;
    const matchesStatus =
      filterStatus === "Semua Status" ||
      (filterStatus === "Aktif" && u.status === "active") ||
      (filterStatus === "Nonaktif" && u.status === "suspended");
    return matchesSearch && matchesRole && matchesStatus;
  });

  // --- BUKA MODAL TAMBAH ---
  const openAddForm = () => {
    setSelectedUser(null);
    setForm({ name: "", username: "", email: "", role: manageableRoles[0] || "operator", password: "" });
    setFormError("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsFormOpen(true);
  };

  // --- BUKA MODAL EDIT ---
  const openEditForm = (u: ManagedUser) => {
    setSelectedUser(u);
    setForm({ name: u.name, username: u.username, email: u.email || "", role: u.role, password: "" });
    setFormError("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsFormOpen(true);
  };

  // --- PILIH FOTO PROFIL (preview dulu, diupload saat form disimpan) ---
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  // --- UPLOAD FOTO PROFIL KE STORAGE, RETURN PUBLIC URL ---
  const uploadAvatarFor = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    setIsUploadingAvatar(true);
    try {
      const compressed = await imageCompression(avatarFile, { maxSizeMB: 0.4, maxWidthOrHeight: 600, useWebWorker: true });
      const fileName = `${Date.now()}-avatar-${userId}`;
      const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, compressed);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
      return publicUrl;
    } catch {
      showToast("error", "Gagal upload foto profil, data lain tetap tersimpan.");
      return null;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // --- SIMPAN TAMBAH / EDIT ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actorRole) return;
    setFormError("");

    if (!manageableRoles.includes(form.role)) {
      setFormError("Anda tidak berwenang menetapkan role ini.");
      return;
    }

    if (!selectedUser && form.password.length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    setIsSaving(true);

    if (selectedUser) {
      // --- EDIT ---
      if (!canEditUser(actorRole, selectedUser.role)) {
        setFormError("Anda tidak berwenang mengedit user ini.");
        setIsSaving(false);
        return;
      }

      const updatePayload: Record<string, any> = {
        name: form.name,
        username: form.username,
        email: form.email || null,
        role: form.role,
      };

      if (avatarFile) {
        const publicUrl = await uploadAvatarFor(selectedUser.id);
        if (publicUrl) updatePayload.avatar_url = publicUrl;
      }

      const { error } = await supabase.from("users").update(updatePayload).eq("id", selectedUser.id);

      setIsSaving(false);
      if (error) {
        setFormError("Gagal menyimpan. Username mungkin sudah dipakai.");
        return;
      }
    } else {
      // --- TAMBAH ---
      const password_hash = await hashPassword(form.password);
      const { data: inserted, error } = await supabase
        .from("users")
        .insert([
          {
            name: form.name,
            username: form.username,
            email: form.email || null,
            role: form.role,
            password_hash,
            status: "active",
          },
        ])
        .select("id")
        .single();

      if (error || !inserted) {
        setIsSaving(false);
        setFormError("Gagal membuat user. Username mungkin sudah dipakai.");
        return;
      }

      if (avatarFile) {
        const publicUrl = await uploadAvatarFor(inserted.id);
        if (publicUrl) {
          await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", inserted.id);
        }
      }

      setIsSaving(false);
    }

    setIsFormOpen(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    showToast("success", selectedUser ? "Perubahan user disimpan." : "User baru berhasil dibuat.");
    fetchUsers();
  };

  // --- SUSPEND / AKTIFKAN ---
  const handleToggleSuspend = async () => {
    if (!suspendTarget || !actorRole) return;
    if (!canSuspend(actorRole, suspendTarget.role)) return;

    const newStatus = suspendTarget.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("users").update({ status: newStatus }).eq("id", suspendTarget.id);

    if (error) {
      showToast("error", "Gagal mengubah status user.");
    } else {
      showToast("success", newStatus === "suspended" ? "User disuspend." : "User diaktifkan kembali.");
      setSuspendTarget(null);
      fetchUsers();
    }
  };

  // --- DELETE PERMANEN ---
  const handleDelete = async () => {
    if (!deleteTarget || !actorRole) return;
    if (!canDelete(actorRole, deleteTarget.role) || !isNeverUsed(deleteTarget)) return;

    const { error } = await supabase.from("users").delete().eq("id", deleteTarget.id);

    if (error) {
      showToast("error", "Gagal menghapus user.");
    } else {
      showToast("success", "User berhasil dihapus permanen.");
      setDeleteTarget(null);
      fetchUsers();
    }
  };

  // --- RESET PASSWORD ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !actorRole) return;
    if (!canResetPassword(actorRole, resetTarget.role)) return;
    if (resetPassword.length < 6) {
      showToast("error", "Password minimal 6 karakter.");
      return;
    }

    setIsResetting(true);
    const password_hash = await hashPassword(resetPassword);
    const { error } = await supabase.from("users").update({ password_hash }).eq("id", resetTarget.id);
    setIsResetting(false);

    if (error) {
      showToast("error", "Gagal mereset password.");
    } else {
      showToast("success", `Password ${resetTarget.name} berhasil direset.`);
      setResetTarget(null);
      setResetPassword("");
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto pb-10 font-poppins text-left transition-colors duration-300 relative">
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white flex items-center gap-2 ${
            toastMsg.type === "success" ? "bg-[#0D9488]" : "bg-red-500"
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pengaturan</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Kelola akun pengguna sistem</p>
      </div>

      <SettingsTabs active="manajemen-user" role={actorRole} />

      {/* HEADER + TOMBOL TAMBAH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Menampilkan {filteredUsers.length} user</p>
        {manageableRoles.length > 0 && (
          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 shadow-md transition-all active:scale-95"
          >
            <Plus size={18} /> Tambah User
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Cari nama/username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all dark:text-white"
          />
        </div>

        <div className="relative">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer"
          >
            <option>Semua Role</option>
            {visibleRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer"
          >
            <option>Semua Status</option>
            <option>Aktif</option>
            <option>Nonaktif</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        </div>
      </div>

      {/* TABEL */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center text-[#94A3B8]">Memuat data...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-20 text-center text-[#94A3B8]">User tidak ditemukan.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] text-sm font-bold">
                  <th className="px-6 py-4"></th>
                  <th className="px-6 py-4">Nama</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {filteredUsers.map((u) => {
                  if (!actorRole) return null;
                  const editable = canEditUser(actorRole, u.role);
                  const suspendable = canSuspend(actorRole, u.role);
                  const deletable = canDelete(actorRole, u.role) && isNeverUsed(u);
                  const resettable = canResetPassword(actorRole, u.role);

                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-[#334155]/30 transition-colors ${u.status === "suspended" ? "opacity-60" : ""}`}>
                      <td className="pl-6 py-5">
                        <Avatar name={u.name} avatarUrl={u.avatar_url} size={36} />
                      </td>
                      <td className="px-6 py-5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{u.name}</td>
                      <td className="px-6 py-5 text-sm text-[#475569] dark:text-[#94A3B8]">{u.username}</td>
                      <td className="px-6 py-5 text-sm text-[#475569] dark:text-[#94A3B8]">{ROLE_LABELS[u.role]}</td>
                      <td className="px-6 py-5 text-center">
                        <Badge status={u.status === "active" ? "Aktif" : "Nonaktif"} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {editable && (
                            <button onClick={() => openEditForm(u)} title="Edit" className="p-2 text-[#64748B] hover:text-primary transition-all">
                              <Pencil size={17} />
                            </button>
                          )}
                          {resettable && (
                            <button onClick={() => { setResetTarget(u); setResetPassword(""); }} title="Reset Password" className="p-2 text-[#64748B] hover:text-primary transition-all">
                              <KeyRound size={17} />
                            </button>
                          )}
                          {suspendable && (
                            <button
                              onClick={() => setSuspendTarget(u)}
                              title={u.status === "active" ? "Suspend" : "Aktifkan"}
                              className={`p-2 transition-all ${u.status === "active" ? "text-[#64748B] hover:text-amber-500" : "text-[#64748B] hover:text-[#0D9488]"}`}
                            >
                              {u.status === "active" ? <Ban size={17} /> : <CheckCircle2 size={17} />}
                            </button>
                          )}
                          {deletable && (
                            <button onClick={() => setDeleteTarget(u)} title="Hapus Permanen" className="p-2 text-[#64748B] hover:text-red-500 transition-all">
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedUser ? "Edit User" : "Tambah User Baru"}>
        <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          {formError && (
            <div className="md:col-span-3 px-4 py-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl">
              {formError}
            </div>
          )}

          {/* KOLOM KIRI: FOTO PROFIL */}
          <div className="md:col-span-1 flex flex-col gap-4 items-center">
            <div className="relative w-32 h-32">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#F8FAFC] dark:border-[#334155] shadow-md bg-gray-100 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Avatar name={form.name || "?"} avatarUrl={selectedUser?.avatar_url} size={128} className="w-full h-full" />
                )}
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <LoaderCircle size={24} className="animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-md hover:bg-[#0B7A70] transition-all"
                title="Ganti Foto"
              >
                <Camera size={16} />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
            </div>
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-xs font-bold text-[#0D9488]">
              {avatarPreview || selectedUser?.avatar_url ? "Ganti Foto" : "Tambah Foto"}
            </button>
            <span className="text-[11px] text-[#94A3B8] text-center -mt-2">Opsional. Tanpa foto, tampil huruf inisial otomatis.</span>
          </div>

          {/* KOLOM KANAN: FIELD FORM */}
          <div className="md:col-span-2 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Nama Lengkap</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Username</label>
              <input
                required
                type="text"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Alamat Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Opsional"
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Role</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
                  className="w-full appearance-none p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
                >
                  {manageableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            <div className="h-[1px] bg-gray-100 dark:bg-[#334155] w-full"></div>

            {!selectedUser ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Password Awal</label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
                />
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8] italic">Untuk mengganti password user ini, gunakan tombol Reset Password di tabel.</p>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving && <LoaderCircle size={16} className="animate-spin" />}
                {selectedUser ? "Simpan Perubahan" : "Buat User"}
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-3 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] rounded-xl font-bold text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL SUSPEND / AKTIFKAN */}
      <Modal isOpen={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={suspendTarget?.status === "active" ? "Suspend User" : "Aktifkan User"}>
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${suspendTarget?.status === "active" ? "bg-amber-50 text-amber-500" : "bg-teal-50 text-[#0D9488]"}`}>
            {suspendTarget?.status === "active" ? <Ban size={32} /> : <CheckCircle2 size={32} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              {suspendTarget?.status === "active" ? `Suspend ${suspendTarget?.name}?` : `Aktifkan kembali ${suspendTarget?.name}?`}
            </h3>
            <p className="text-xs text-[#94A3B8] mt-2 italic">
              {suspendTarget?.status === "active"
                ? "User tidak akan bisa login sampai diaktifkan kembali. Aksi ini bisa dibatalkan kapan saja."
                : "User akan bisa login kembali seperti biasa."}
            </p>
          </div>
          <div className="flex gap-4 w-full mt-4">
            <button onClick={() => setSuspendTarget(null)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]">
              Batal
            </button>
            <button
              onClick={handleToggleSuspend}
              className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md transition-all ${suspendTarget?.status === "active" ? "bg-amber-500 hover:bg-amber-600" : "bg-[#0D9488] hover:bg-teal-700"}`}
            >
              {suspendTarget?.status === "active" ? "Ya, Suspend" : "Ya, Aktifkan"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DELETE PERMANEN */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus User Permanen">
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><AlertTriangle size={32} /></div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Hapus {deleteTarget?.name} secara permanen?</h3>
            <p className="text-xs text-[#94A3B8] mt-2 italic">
              Akun ini belum pernah dipakai login, jadi aman dihapus permanen. Aksi ini tidak bisa dibatalkan.
            </p>
          </div>
          <div className="flex gap-4 w-full mt-4">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]">
              Batal
            </button>
            <button onClick={handleDelete} className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md">
              Ya, Hapus Permanen
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL RESET PASSWORD */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.name || ""}`}>
        <form onSubmit={handleResetPassword} className="flex flex-col gap-5 max-w-lg">
          <p className="text-xs text-[#94A3B8] italic">
            Password baru berlaku langsung tanpa verifikasi email. Sampaikan password ini ke user yang bersangkutan secara langsung.
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Password Baru</label>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white font-bold"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setResetTarget(null)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-secondary dark:text-[#94A3B8] font-bold text-sm hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">
              Batalkan
            </button>
            <button type="submit" disabled={isResetting} className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-60">
              {isResetting ? "Menyimpan..." : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}