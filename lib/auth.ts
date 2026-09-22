import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export type Role = "super_admin" | "administrator" | "manajemen" | "operator";
export type UserStatus = "active" | "suspended";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: Role;
  status: UserStatus;
  avatar_seed: string;
  avatar_url: string | null;
  language: "id" | "en";
  notification_settings: {
    notifEmail: boolean;
    notifMaint: boolean;
    notifStock: boolean;
    notifReport: boolean;
  };
}

const SESSION_KEY = "inu_asset_session";

// Label tampilan untuk tiap role (dipakai di Sidebar, Manajemen User, dll)
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  administrator: "Administrator",
  manajemen: "Manajemen",
  operator: "Operator",
};

export const ALL_ROLES: Role[] = ["super_admin", "administrator", "manajemen", "operator"];

// =====================================================================
// Pembatasan halaman untuk role Operator
// Operator hanya boleh mengakses: Dashboard, Buku Sakit (hanya bagian
// tambah kerusakan aset), Pemeliharaan (semua halaman kecuali form
// "Terbitkan Work Order" di Pemeliharaan Korektif), dan Pengaturan
// (hanya tab Profil Saya — halaman Manajemen User tetap tertutup).
// =====================================================================

// Prefix path yang boleh diakses oleh role operator. Path lain otomatis
// di-redirect ke Dashboard oleh <RoleGuard /> di AppShell.
const OPERATOR_ALLOWED_PREFIXES = [
  "/", // dashboard (exact match, ditangani khusus di isPathAllowedForOperator)
  "/buku-sakit",
  "/pemeliharaan",
  "/pengaturan", // /pengaturan/manajemen-user tetap diblokir terpisah (lihat di bawah)
];

// Path yang secara eksplisit TETAP diblokir untuk operator walau prefix-nya
// termasuk yang diizinkan di atas.
const OPERATOR_BLOCKED_EXACT = [
  "/pengaturan/manajemen-user",
];

export function isPathAllowedForOperator(pathname: string): boolean {
  if (pathname === "/") return true;
  if (OPERATOR_BLOCKED_EXACT.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return false;
  }
  return OPERATOR_ALLOWED_PREFIXES.some((prefix) => prefix !== "/" && pathname.startsWith(prefix));
}

// Buat hash password (dipakai saat membuat/mengganti akun)
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// Login: cek username + password ke tabel `users`
export async function login(
  username: string,
  password: string
): Promise<{ user?: SessionUser; error?: string }> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username.trim())
    .maybeSingle();

  if (error) return { error: "Gagal terhubung ke database." };
  if (!data) return { error: "Username tidak ditemukan." };

  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) return { error: "Password salah." };

  if (data.status === "suspended") {
    return { error: "Akun ini telah dinonaktifkan (suspend). Hubungi administrator." };
  }

  const now = new Date().toISOString();

  // Catat waktu login terakhir (dipakai untuk syarat Delete permanen di Manajemen User)
  const { error: updateError } = await supabase
    .from("users")
    .update({ last_login_at: now })
    .eq("id", data.id);

  if (updateError) {
    // Jangan gagalkan login hanya karena gagal mencatat last_login_at
    console.error("Gagal mencatat last_login_at:", updateError);
  }

  const user: SessionUser = {
    id: data.id,
    username: data.username,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status || "active",
    avatar_seed: data.avatar_seed || "Felix",
    avatar_url: data.avatar_url || null,
    language: data.language || "id",
    notification_settings: data.notification_settings || {
      notifEmail: true,
      notifMaint: true,
      notifStock: true,
      notifReport: false,
    },
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  return { user };
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

// Foto profil asli jika sudah upload, atau null kalau belum.
// Fallback tampilan (huruf inisial ala WhatsApp) ditangani oleh komponen <Avatar />,
// bukan lagi avatar generik dicebear.
export function resolveAvatarUrl(user: Pick<SessionUser, "avatar_url"> | null | undefined) {
  return user?.avatar_url || null;
}

// =====================================================================
// Permission helpers untuk halaman Manajemen User
// Aturan:
// - super_admin: kendali penuh atas semua role (lihat, tambah, edit,
//   suspend, delete, reset password)
// - administrator: hanya boleh menambah/mengedit/suspend/reset password
//   untuk role manajemen & operator. Tidak bisa melihat/mengubah
//   super_admin sama sekali, dan tidak bisa membuat/mengedit sesama
//   administrator. Administrator tidak punya akses Delete permanen.
// =====================================================================

// Role apa saja yang boleh dilihat oleh actor di halaman Manajemen User
export function getVisibleRoles(actorRole: Role): Role[] {
  if (actorRole === "super_admin") {
    return ["super_admin", "administrator", "manajemen", "operator"];
  }
  if (actorRole === "administrator") {
    return ["administrator", "manajemen", "operator"];
  }
  return [];
}

// Role apa saja yang boleh ditambah/diedit oleh actor
export function getManageableRoles(actorRole: Role): Role[] {
  if (actorRole === "super_admin") {
    return ["administrator", "manajemen", "operator"];
  }
  if (actorRole === "administrator") {
    return ["manajemen", "operator"];
  }
  return [];
}

// Apakah actor boleh mengedit data (nama, email, role, dll) milik target
export function canEditUser(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "super_admin") {
    return targetRole !== "super_admin"; // super_admin tidak edit dirinya sendiri lewat sini
  }
  if (actorRole === "administrator") {
    return targetRole === "manajemen" || targetRole === "operator";
  }
  return false;
}

// Apakah actor boleh suspend / unsuspend target
export function canSuspend(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "super_admin") {
    return targetRole !== "super_admin";
  }
  if (actorRole === "administrator") {
    return targetRole === "manajemen" || targetRole === "operator";
  }
  return false;
}

// Apakah actor boleh menghapus permanen target
// (masih harus dicek terpisah: target.last_login_at === null)
export function canDelete(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "super_admin") {
    return targetRole !== "super_admin";
  }
  return false;
}

// Apakah actor boleh reset password target
export function canResetPassword(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "super_admin") {
    return true;
  }
  if (actorRole === "administrator") {
    return targetRole === "manajemen" || targetRole === "operator";
  }
  return false;
}

// Helper gabungan: apakah target ini akun yang belum pernah dipakai login
// (syarat wajib sebelum tombol Delete permanen boleh ditampilkan)
export function isNeverUsed(target: Pick<SessionUser, "status"> & { last_login_at?: string | null }): boolean {
  return !target.last_login_at;
}