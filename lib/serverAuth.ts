// KHUSUS SERVER (dipakai di API route). Jangan di-import dari komponen "use client".
//
// Fungsinya: mengecek "siapa yang memanggil API ini dan bolehkah dia?"
// Browser mengirim token login lewat header Authorization: Bearer <token>.
// Server memverifikasi token itu ke Supabase, lalu memeriksa role dan status
// akunnya di tabel `users`. Jadi aturan siapa boleh apa dijaga di server dan
// tidak bisa dilewati lewat DevTools.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Role } from "@/lib/auth";

export interface Actor {
  id: string;
  username: string;
  name: string;
  role: Role;
  authEmail: string; // email login di Supabase Auth (username@inu-asset.internal)
}

// Ambil user yang sedang memanggil. Mengembalikan null kalau token tidak ada /
// tidak valid, atau akunnya suspended / tidak aktif / tidak punya profil.
export async function getActor(request: Request): Promise<Actor | null> {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(match[1]);
  if (authError || !authData.user) return null;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id, username, name, role, status, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) return null;
  if (profile.status !== "active" || profile.is_active === false) return null;

  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    role: profile.role as Role,
    authEmail: authData.user.email || "",
  };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Baca body JSON dengan aman (null kalau bukan JSON yang valid)
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Username: 3-40 karakter; huruf, angka, titik, garis bawah, strip
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/;
export const USERNAME_RULE_MESSAGE =
  "Username 3-40 karakter, hanya huruf, angka, titik, garis bawah, atau strip.";

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Foto profil hanya boleh berasal dari bucket asset-images milik project ini
// (mencegah orang menyisipkan link sembarang ke profil user lain).
export function isOwnAvatarUrl(url: string): boolean {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/asset-images/`;
  return url.startsWith(base) && url.length < 600;
}

// Kolom password_hash di tabel `users` masih NOT NULL, tapi login sekarang
// sepenuhnya lewat Supabase Auth. Nilai ini cuma pengisi supaya insert lolos
// (bukan hash yang valid, jadi tidak bisa dipakai apa-apa).
export const PASSWORD_HASH_PLACEHOLDER = "dikelola-supabase-auth";

// Kode error dari Supabase Auth untuk "email/username sudah ada"
export function isDuplicateAuthError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "email_exists" || /already (been )?registered|already exists/i.test(error.message || "");
}