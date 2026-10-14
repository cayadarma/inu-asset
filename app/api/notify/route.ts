// app/api/notify/route.ts
//
// Dipanggil browser SETELAH insert/update berhasil, supaya API key Resend tetap di server.
// Body: { type, id }
//   type = "damage_report" | "work_order_created" | "work_order_update" | "emergency" | "low_stock"
//   id   = id record terkait (browser hanya kirim ID; penerima & isi email ditentukan server).
//
// Keamanan:
//   - Wajib login (token dari header Authorization), akun harus aktif.
//   - Role manajemen tidak boleh memicu notifikasi (mereka memang tidak membuat data).
//   - Dibatasi 30 permintaan per menit per akun.
//   - Data debug (nama/email penerima) hanya dikembalikan ke super_admin.
import { NextResponse } from "next/server";
import {
  notifyDamageReport,
  notifyWorkOrderCreated,
  notifyWorkOrderUpdate,
  notifyEmergencyRepair,
  notifyLowStock,
} from "@/lib/notify";
import { getActor, jsonError, readJson } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "damage_report",
  "work_order_created",
  "work_order_update",
  "emergency",
  "low_stock",
] as const;
type NotifyType = (typeof ALLOWED_TYPES)[number];

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

async function run(type: NotifyType, id: string): Promise<unknown> {
  switch (type) {
    case "damage_report":
      return notifyDamageReport(id);
    case "work_order_created":
      return notifyWorkOrderCreated(id);
    case "work_order_update":
      return notifyWorkOrderUpdate(id);
    case "emergency":
      return notifyEmergencyRepair(id);
    case "low_stock":
      return notifyLowStock(id);
  }
}

export async function POST(request: Request) {
  const actor = await getActor(request);
  if (!actor) return jsonError("Sesi tidak valid. Silakan login ulang.", 401);
  if (actor.role === "manajemen") return jsonError("Anda tidak berwenang.", 403);

  if (!rateLimit(`notify:${actor.id}`, 30, 60_000)) {
    return jsonError("Terlalu banyak permintaan. Coba lagi sebentar.", 429);
  }

  const body = await readJson(request);
  if (!body) return jsonError("Body bukan JSON", 400);

  const type = body.type;
  if (typeof type !== "string" || !(ALLOWED_TYPES as readonly string[]).includes(type)) {
    return jsonError("type tidak dikenal", 400);
  }

  const id = typeof body.id === "string" || typeof body.id === "number" ? String(body.id) : "";
  if (!ID_PATTERN.test(id)) return jsonError("id tidak valid", 400);

  try {
    const result = (await run(type as NotifyType, id)) as Record<string, unknown>;
    const { debug, ...safe } = result;
    return NextResponse.json({
      ok: true,
      ...safe,
      ...(actor.role === "super_admin" && debug ? { debug } : {}),
    });
  } catch (err) {
    console.error("[notify] gagal:", err);
    return jsonError("Gagal mengirim notifikasi.", 500);
  }
}