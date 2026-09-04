import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export type Role = "administrator" | "operator";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: Role;
  avatar_seed: string;
  language: "id" | "en";
  notification_settings: {
    notifEmail: boolean;
    notifMaint: boolean;
    notifStock: boolean;
    notifReport: boolean;
  };
}

const SESSION_KEY = "inu_asset_session";

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
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error) return { error: "Gagal terhubung ke database." };
  if (!data) return { error: "Username tidak ditemukan." };

  const isValid = await bcrypt.compare(password, data.password_hash);
  if (!isValid) return { error: "Password salah." };

  const user: SessionUser = {
    id: data.id,
    username: data.username,
    name: data.name,
    email: data.email,
    role: data.role,
    avatar_seed: data.avatar_seed || "Felix",
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
