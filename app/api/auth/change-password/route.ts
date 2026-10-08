// POST /api/auth/change-password  body: { currentPassword, newPassword }
// Ganti password milik sendiri. Wajib mengisi password saat ini.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { validatePassword } from "@/lib/passwordPolicy";
import { getActor, jsonError, readJson } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = await getActor(request);
  if (!actor) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  const body = await readJson(request);
  if (!body) return jsonError("Data tidak valid.", 400);

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) return jsonError("Password saat ini wajib diisi.", 400);

  const passwordError = validatePassword(newPassword, actor.username);
  if (passwordError) return jsonError(passwordError, 400);

  if (newPassword === currentPassword) {
    return jsonError("Password baru tidak boleh sama dengan password saat ini.", 400);
  }

  // Cek password saat ini dengan klien terpisah (tidak menyimpan sesi apa pun)
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: actor.authEmail,
    password: currentPassword,
  });
  if (verifyError) return jsonError("Password saat ini salah.", 400);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(actor.id, { password: newPassword });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "weak_password") return jsonError("Password ditolak karena terlalu lemah.", 400);
    console.error("Ganti password gagal:", error);
    return jsonError("Gagal mengganti password.", 500);
  }

  return NextResponse.json({ ok: true });
}