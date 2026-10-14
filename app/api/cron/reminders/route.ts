// app/api/cron/reminders/route.ts
//
// Pengingat pemeliharaan pencegahan. Dipanggil Supabase Cron (pg_cron + pg_net) setiap hari
// 23:00 UTC = 07:00 WITA. Mengirim email ke semua operator berisi jadwal berstatus "Terjadwal"
// yang tanggalnya HARI INI (WITA).
//
// Keamanan: header "Authorization: Bearer <CRON_SECRET>" (sama seperti cron snapshot).

import { NextResponse } from "next/server";
import { sendMaintenanceReminders } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET belum diset" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendMaintenanceReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[reminders] gagal:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Gagal" }, { status: 500 });
  }
}