import bcrypt from "bcryptjs";
import { supabase, REMEMBER_FLAG_KEY } from "@/lib/supabase";

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

// Kunci sesi LAMA (sebelum Supabase Auth). Tidak dipakai lagi dan dibersihkan
// otomatis dari browser supaya tidak ada data sesi usang yang tertinggal.
const LEGACY_SESSION_KEY = "inu_asset_session";

// Batas umur sesi di sisi aplikasi (lapisan tambahan di atas token Supabase)
const EXPIRES_AT_KEY = "inu_session_expires_at";
const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
const SESSION_ONLY_DURATION_MS = 12 * 60 * 60 * 1000; // 12 jam

// Supabase Auth login-nya pakai email. Aplikasi tetap pakai USERNAME,
// jadi username diubah jadi email khusus login (harus sama dengan file
// 01-migrasi-users-ke-supabase-auth.sql).
const LOGIN_EMAIL_DOMAIN = "inu-asset.internal";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;
}

// Label tampilan untuk tiap role (dipakai di Sidebar, Manajemen User, dll)
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  administrator: "Administrator",
  manajemen: "Manajemen",
  operator: "Operator",
};

export const ALL_ROLES: Role[] = ["super_admin", "administrator", "manajemen", "operator"];

// =====================================================================
// Pembatasan halaman per role
// - Operator hanya boleh mengakses: Dashboard, Buku Sakit (hanya bagian
//   tambah kerusakan aset), Pemeliharaan (semua halaman kecuali form
//   "Terbitkan Work Order" di Pemeliharaan Korektif), dan Pengaturan
//   (hanya tab Profil Saya — halaman Manajemen User tetap tertutup).
// - Manajemen hanya boleh mengakses: Dashboard, Analisis Biaya, Anggaran,
//   Laporan, dan Pengaturan (hanya tab Profil Saya).
// =====================================================================

// Prefix path yang boleh diakses per role. Path lain otomatis
// di-redirect ke Dashboard oleh guard di AppShell.
const ROLE_ALLOWED_PREFIXES: Partial<Record<Role, string[]>> = {
  operator: [
    "/", // dashboard (exact match, ditangani khusus di isPathAllowedForRole)
    "/buku-sakit",
    "/pemeliharaan",
    "/pengaturan", // /pengaturan/manajemen-user tetap diblokir terpisah (lihat di bawah)
  ],
  manajemen: [
    "/", // dashboard (exact match, ditangani khusus di isPathAllowedForRole)
    "/analisis-biaya",
    "/anggaran",
    "/laporan",
    "/pengaturan", // /pengaturan/manajemen-user tetap diblokir terpisah (lihat di bawah)
  ],
};

// Path yang secara eksplisit TETAP diblokir untuk role tertentu walau
// prefix-nya termasuk yang diizinkan di atas.
const ROLE_BLOCKED_EXACT: Partial<Record<Role, string[]>> = {
  operator: ["/pengaturan/manajemen-user"],
  manajemen: ["/pengaturan/manajemen-user"],
};

// Cek apakah suatu path boleh diakses oleh role tertentu. Role yang tidak
// terdaftar di ROLE_ALLOWED_PREFIXES (super_admin, administrator) dianggap
// bebas akses ke semua halaman.
export function isPathAllowedForRole(pathname: string, role: Role): boolean {
  const allowedPrefixes = ROLE_ALLOWED_PREFIXES[role];
  if (!allowedPrefixes) return true; // role tanpa pembatasan (super_admin, administrator)

  if (pathname === "/") return true;

  const blockedExact = ROLE_BLOCKED_EXACT[role] || [];
  if (blockedExact.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return false;
  }

  return allowedPrefixes.some((prefix) => prefix !== "/" && pathname.startsWith(prefix));
}

// Dipertahankan untuk kompatibilitas kode lama yang masih memanggil nama ini.
export function isPathAllowedForOperator(pathname: string): boolean {
  return isPathAllowedForRole(pathname, "operator");
}

// Buat hash password.
// CATATAN: setelah pindah ke Supabase Auth, hash di tabel `users` TIDAK lagi
// dipakai untuk login. Fungsi ini masih dipakai halaman Pengaturan dan
// Manajemen User, dan akan dihapus saat kedua halaman itu dipindah ke API server.
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// =====================================================================
// LOGIN & SESI (Supabase Auth)
// Sesi sekarang dipegang Supabase Auth (token yang diverifikasi server),
// bukan lagi data buatan sendiri di localStorage.
// rememberMe = true  -> sesi bertahan 30 hari walau browser ditutup
// rememberMe = false -> sesi hilang saat tab/browser ditutup (maks 12 jam)
// =====================================================================

const PROFILE_COLUMNS =
  "id, username, name, email, role, status, is_active, avatar_seed, avatar_url, language, notification_settings";

type ProfileResult =
  | { user: SessionUser }
  | { error: string; invalid: boolean }; // invalid = akun tidak boleh dipakai (hapus sesi)

// Ambil profil (nama, role, dll) dari tabel `users`. Tidak pernah mengambil password_hash.
async function fetchProfile(userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from("users")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) return { error: "Gagal terhubung ke database.", invalid: false };
  if (!data) return { error: "Profil akun tidak ditemukan. Hubungi administrator.", invalid: true };

  if (data.status === "suspended" || data.is_active === false) {
    return {
      error: "Akun ini telah dinonaktifkan (suspend). Hubungi administrator.",
      invalid: true,
    };
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

  return { user };
}

function clearLegacyAndExpiry() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  window.localStorage.removeItem(EXPIRES_AT_KEY);
  window.sessionStorage.removeItem(EXPIRES_AT_KEY);
}

function writeExpiry(rememberMe: boolean) {
  if (typeof window === "undefined") return;
  const durationMs = rememberMe ? REMEMBER_ME_DURATION_MS : SESSION_ONLY_DURATION_MS;
  const value = String(Date.now() + durationMs);
  const target = rememberMe ? window.localStorage : window.sessionStorage;
  const other = rememberMe ? window.sessionStorage : window.localStorage;
  other.removeItem(EXPIRES_AT_KEY);
  target.setItem(EXPIRES_AT_KEY, value);
}

function readExpiry(): number | null {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(EXPIRES_AT_KEY) ?? window.sessionStorage.getItem(EXPIRES_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Login: username + password diperiksa oleh Supabase Auth (di server).
export async function login(
  username: string,
  password: string,
  rememberMe: boolean = false
): Promise<{ user?: SessionUser; error?: string }> {
  if (typeof window === "undefined") return { error: "Login hanya bisa dilakukan dari browser." };

  // Pilihan "Ingat saya" harus dicatat SEBELUM login, supaya token
  // tersimpan di tempat yang benar (localStorage atau sessionStorage).
  window.localStorage.setItem(REMEMBER_FLAG_KEY, rememberMe ? "1" : "0");
  clearLegacyAndExpiry();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error || !data.user) {
    const code = (error as { code?: string; status?: number } | null)?.code;
    const status = (error as { code?: string; status?: number } | null)?.status;
    if (code === "user_banned") {
      return { error: "Akun ini telah dinonaktifkan (suspend). Hubungi administrator." };
    }
    if (code === "over_request_rate_limit" || status === 429) {
      return { error: "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi." };
    }
    // Pesan sengaja sama untuk username salah maupun password salah
    return { error: "Username atau password salah." };
  }

  const profile = await fetchProfile(data.user.id);
  if ("error" in profile) {
    // Akun tidak boleh dipakai -> batalkan login (hanya di perangkat ini)
    if (profile.invalid) await supabase.auth.signOut({ scope: "local" });
    return { error: profile.error };
  }

  writeExpiry(rememberMe);

  // Catat waktu login terakhir (dipakai untuk syarat Delete permanen di Manajemen User)
  const { error: updateError } = await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  if (updateError) {
    // Jangan gagalkan login hanya karena gagal mencatat last_login_at
    console.error("Gagal mencatat last_login_at:", updateError);
  }

  return { user: profile.user };
}

export async function logout(): Promise<void> {
  // scope "local" = keluar di perangkat ini saja (tidak menendang
  // perangkat lain yang sedang dipakai akun yang sama)
  await supabase.auth.signOut({ scope: "local" });
  clearLegacyAndExpiry();
}

// Dipanggil saat aplikasi dibuka / di-refresh: pulihkan sesi kalau masih sah.
// Token diperiksa ke server Supabase (bukan sekadar dibaca dari browser),
// jadi sesi palsu atau akun yang sudah diblokir tidak akan lolos.
export async function restoreSession(): Promise<SessionUser | null> {
  if (typeof window === "undefined") return null;

  // Bersihkan sisa sesi lama buatan sendiri
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  // Batas umur sesi di sisi aplikasi
  const expiresAt = readExpiry();
  if (expiresAt !== null && expiresAt < Date.now()) {
    await logout();
    return null;
  }
  if (expiresAt === null) {
    // Sesi ada tapi penanda umurnya hilang -> perlakukan sebagai sesi biasa (12 jam)
    writeExpiry(window.localStorage.getItem(REMEMBER_FLAG_KEY) === "1");
  }

  // Verifikasi token ke server
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    await logout();
    return null;
  }

  const profile = await fetchProfile(userData.user.id);
  if ("error" in profile) {
    if (profile.invalid) await logout();
    return null;
  }

  return profile.user;
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