// PATCH  /api/admin/users/[id] -> edit user (nama, username, email, role, foto)
// DELETE /api/admin/users/[id] -> hapus permanen (hanya akun yang belum pernah login)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ALL_ROLES,
  Role,
  canDelete,
  canEditUser,
  getManageableRoles,
  usernameToEmail,
} from "@/lib/auth";
import {
  getActor,
  jsonError,
  readJson,
  isValidEmail,
  isOwnAvatarUrl,
  isDuplicateAuthError,
  USERNAME_PATTERN,
  USERNAME_RULE_MESSAGE,
} from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadTarget(id: string) {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, username, role, status, last_login_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}

// ---------------------------------------------------------------- EDIT
export async function PATCH(request: Request, { params }: RouteContext) {
  const actor = await getActor(request);
  if (!actor) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  const { id } = await params;
  const target = await loadTarget(id);
  if (!target) return jsonError("User tidak ditemukan.", 404);

  if (!canEditUser(actor.role, target.role as Role)) {
    return jsonError("Anda tidak berwenang mengedit user ini.", 403);
  }

  const body = await readJson(request);
  if (!body) return jsonError("Data tidak valid.", 400);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const role = body.role as Role;

  if (!name || name.length > 100) return jsonError("Nama wajib diisi (maksimal 100 karakter).", 400);
  if (!USERNAME_PATTERN.test(username)) return jsonError(USERNAME_RULE_MESSAGE, 400);
  if (emailRaw && !isValidEmail(emailRaw)) return jsonError("Format email tidak valid.", 400);

  if (!ALL_ROLES.includes(role) || !getManageableRoles(actor.role).includes(role)) {
    return jsonError("Anda tidak berwenang menetapkan role ini.", 403);
  }

  const updates: Record<string, unknown> = {
    name,
    username,
    email: emailRaw || null,
    role,
    updated_at: new Date().toISOString(),
  };

  if (body.avatarUrl !== undefined) {
    if (typeof body.avatarUrl !== "string" || !isOwnAvatarUrl(body.avatarUrl)) {
      return jsonError("Alamat foto tidak valid.", 400);
    }
    updates.avatar_url = body.avatarUrl;
  }

  // Kalau username berubah, email login di Supabase Auth ikut diganti
  const usernameChanged = username !== target.username;
  if (usernameChanged) {
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: usernameToEmail(username),
      email_confirm: true,
    });
    if (emailError) {
      if (isDuplicateAuthError(emailError)) return jsonError("Username sudah dipakai.", 409);
      console.error("Ganti email login gagal:", emailError);
      return jsonError("Gagal mengubah username.", 500);
    }
  }

  const { error: updateError } = await supabaseAdmin.from("users").update(updates).eq("id", id);

  if (updateError) {
    if (usernameChanged) {
      // kembalikan email login seperti semula
      await supabaseAdmin.auth.admin.updateUserById(id, {
        email: usernameToEmail(target.username),
        email_confirm: true,
      });
    }
    console.error("Update profil gagal:", updateError);
    return jsonError("Gagal menyimpan. Username mungkin sudah dipakai.", 409);
  }

  return NextResponse.json({ ok: true });
}

// ------------------------------------------------------------- HAPUS
export async function DELETE(request: Request, { params }: RouteContext) {
  const actor = await getActor(request);
  if (!actor) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  const { id } = await params;
  const target = await loadTarget(id);
  if (!target) return jsonError("User tidak ditemukan.", 404);

  if (!canDelete(actor.role, target.role as Role)) {
    return jsonError("Anda tidak berwenang menghapus user ini.", 403);
  }
  if (target.last_login_at) {
    return jsonError("Akun ini sudah pernah dipakai login. Gunakan Suspend, bukan Hapus.", 409);
  }

  const { error: deleteError } = await supabaseAdmin.from("users").delete().eq("id", id);
  if (deleteError) {
    console.error("Hapus profil gagal:", deleteError);
    return jsonError("Gagal menghapus user (mungkin sudah terpakai di data lain).", 409);
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authDeleteError) {
    // Profil sudah terhapus, jadi akun ini tidak bisa masuk ke aplikasi lagi
    console.error("Hapus akun login gagal:", authDeleteError);
  }

  return NextResponse.json({ ok: true });
}