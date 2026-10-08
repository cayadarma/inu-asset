// POST /api/admin/users/[id]/reset-password  body: { password }
// Admin menetapkan password baru untuk user lain (tanpa email verifikasi).
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Role, canResetPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/passwordPolicy";
import { getActor, jsonError, readJson } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const actor = await getActor(request);
  if (!actor) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  const { id } = await params;
  const body = await readJson(request);
  const password = body && typeof body.password === "string" ? body.password : "";
  if (!body) return jsonError("Data tidak valid.", 400);

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, username, role")
    .eq("id", id)
    .maybeSingle();
  if (!target) return jsonError("User tidak ditemukan.", 404);

  if (!canResetPassword(actor.role, target.role as Role)) {
    return jsonError("Anda tidak berwenang mereset password user ini.", 403);
  }

  const passwordError = validatePassword(password, target.username);
  if (passwordError) return jsonError(passwordError, 400);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "same_password") return jsonError("Password baru tidak boleh sama dengan yang lama.", 400);
    if (code === "weak_password") return jsonError("Password ditolak karena terlalu lemah.", 400);
    console.error("Reset password gagal:", error);
    return jsonError("Gagal mereset password.", 500);
  }

  return NextResponse.json({ ok: true });
}