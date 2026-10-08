// POST /api/admin/users  -> tambah user baru
// Membuat akun login di Supabase Auth + profil di tabel `users` dengan ID yang sama.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ALL_ROLES, Role, getManageableRoles, usernameToEmail } from "@/lib/auth";
import { validatePassword } from "@/lib/passwordPolicy";
import {
  getActor,
  jsonError,
  readJson,
  isValidEmail,
  isDuplicateAuthError,
  USERNAME_PATTERN,
  USERNAME_RULE_MESSAGE,
  PASSWORD_HASH_PLACEHOLDER,
} from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = await getActor(request);
  if (!actor) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);

  const body = await readJson(request);
  if (!body) return jsonError("Data tidak valid.", 400);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const role = body.role as Role;
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || name.length > 100) return jsonError("Nama wajib diisi (maksimal 100 karakter).", 400);
  if (!USERNAME_PATTERN.test(username)) return jsonError(USERNAME_RULE_MESSAGE, 400);
  if (emailRaw && !isValidEmail(emailRaw)) return jsonError("Format email tidak valid.", 400);

  // Role harus dikenal DAN boleh ditetapkan oleh pemanggil
  if (!ALL_ROLES.includes(role) || !getManageableRoles(actor.role).includes(role)) {
    return jsonError("Anda tidak berwenang menetapkan role ini.", 403);
  }

  const passwordError = validatePassword(password, username);
  if (passwordError) return jsonError(passwordError, 400);

  // 1) Buat akun login
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, name },
  });

  if (createError || !created?.user) {
    if (isDuplicateAuthError(createError)) return jsonError("Username sudah dipakai.", 409);
    if ((createError as { code?: string } | null)?.code === "weak_password") {
      return jsonError("Password ditolak karena terlalu lemah.", 400);
    }
    console.error("createUser gagal:", createError);
    return jsonError("Gagal membuat akun.", 500);
  }

  // 2) Buat profil dengan ID yang sama
  const { error: insertError } = await supabaseAdmin.from("users").insert([
    {
      id: created.user.id,
      name,
      username,
      email: emailRaw || null,
      role,
      password_hash: PASSWORD_HASH_PLACEHOLDER,
      status: "active",
    },
  ]);

  if (insertError) {
    // Batalkan akun login yang tadi dibuat supaya tidak ada akun yatim
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    console.error("Insert profil gagal:", insertError);
    return jsonError("Gagal menyimpan profil. Username mungkin sudah dipakai.", 409);
  }

  return NextResponse.json({ id: created.user.id }, { status: 201 });
}