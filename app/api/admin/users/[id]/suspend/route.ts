// POST /api/admin/users/[id]/suspend  body: { suspend: true | false }
// Suspend = akun diblokir di Supabase Auth (tidak bisa login / refresh sesi)
// DAN status di tabel `users` jadi "suspended" (akses data langsung ditutup
// oleh policy RLS, tanpa menunggu sesi berakhir).
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Role, canSuspend } from "@/lib/auth";
import { getActor, jsonError, readJson } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const BAN_FOREVER = "876000h"; // ~100 tahun

export async function POST(request: Request, { params }: RouteContext) {
  const actor = await getActor(request);
  if (!actor) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  const { id } = await params;
  const body = await readJson(request);
  if (!body || typeof body.suspend !== "boolean") return jsonError("Data tidak valid.", 400);
  const suspend = body.suspend;

  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();
  if (!target) return jsonError("User tidak ditemukan.", 404);

  if (!canSuspend(actor.role, target.role as Role)) {
    return jsonError("Anda tidak berwenang mengubah status user ini.", 403);
  }

  // 1) Blokir / buka blokir di Supabase Auth
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: suspend ? BAN_FOREVER : "none",
  });
  if (banError) {
    console.error("Ubah blokir Auth gagal:", banError);
    return jsonError("Gagal mengubah status user.", 500);
  }

  // 2) Ubah status di tabel users
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ status: suspend ? "suspended" : "active", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    // kembalikan blokir seperti semula
    await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: suspend ? "none" : BAN_FOREVER,
    });
    console.error("Ubah status users gagal:", updateError);
    return jsonError("Gagal mengubah status user.", 500);
  }

  return NextResponse.json({ ok: true, status: suspend ? "suspended" : "active" });
}