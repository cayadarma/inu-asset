// app/api/notify/route.ts
//
// Dipanggil browser SETELAH insert/update berhasil, supaya API key Resend tetap di server.
// Body: { type, id }
//   type = "damage_report" | "work_order_created" | "work_order_update" | "emergency" | "low_stock"
//   id   = id record terkait (browser hanya kirim ID; penerima & isi email ditentukan server).
//
// TODO keamanan (ditunda sampai fitur final): endpoint ini belum memverifikasi pemanggil.

import { NextResponse } from "next/server";
import {
  notifyDamageReport,
  notifyWorkOrderCreated,
  notifyWorkOrderUpdate,
  notifyEmergencyRepair,
  notifyLowStock,
} from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });
  }

  const { type, id } = body || {};
  if (!type || !id) {
    return NextResponse.json({ error: "type dan id wajib diisi" }, { status: 400 });
  }

  try {
    let result;
    switch (type) {
      case "damage_report":
        result = await notifyDamageReport(String(id));
        break;
      case "work_order_created":
        result = await notifyWorkOrderCreated(String(id));
        break;
      case "work_order_update":
        result = await notifyWorkOrderUpdate(String(id));
        break;
      case "emergency":
        result = await notifyEmergencyRepair(String(id));
        break;
      case "low_stock":
        result = await notifyLowStock(String(id));
        break;
      default:
        return NextResponse.json({ error: `type tidak dikenal: ${type}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[notify] gagal:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Gagal" }, { status: 500 });
  }
}