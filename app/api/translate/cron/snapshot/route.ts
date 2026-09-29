// app/api/cron/snapshot/route.ts
//
// Dipanggil otomatis oleh Vercel Cron (lihat vercel.json) setiap hari 15:00 UTC
// = 23:00 WITA. Menyimpan kondisi akhir hari semua aset ke asset_status_snapshots.
//
// Keamanan: Vercel mengirim header "Authorization: Bearer <CRON_SECRET>" otomatis kalau
// environment variable CRON_SECRET diisi di project Vercel. Tanpa header yang cocok -> 401.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  AssetForSnapshot,
  SNAPSHOT_CONFLICT_KEY,
  buildSnapshotRows,
  getWitaDateStr,
} from "@/lib/assetSnapshot";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET belum diset" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ambil semua aset (dipaginasi supaya tidak terpotong batas 1000 baris PostgREST)
  const PAGE_SIZE = 1000;
  const assets: AssetForSnapshot[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("status, is_active, location_id")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    assets.push(...(data as AssetForSnapshot[]));
    if (data.length < PAGE_SIZE) break;
  }

  const snapshotDate = getWitaDateStr();
  const rows = buildSnapshotRows(assets, snapshotDate);

  if (rows.length > 0) {
    const { error } = await supabaseAdmin
      .from("asset_status_snapshots")
      .upsert(rows, { onConflict: SNAPSHOT_CONFLICT_KEY });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, snapshotDate, locations: rows.length });
}