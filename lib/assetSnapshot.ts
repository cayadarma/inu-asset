// lib/assetSnapshot.ts
//
// Helper BERSAMA untuk membuat baris snapshot status aset harian.
// Dipakai oleh:
//   - app/page.tsx                       (Dashboard, di browser)
//   - app/api/cron/snapshot/route.ts     (cron Vercel, di server)
// Satu sumber aturan supaya keduanya selalu menghasilkan data yang identik.

export const WITA_OFFSET_HOURS = 8;

// --- Tanggal "hari ini" dalam WITA (UTC+8), format YYYY-MM-DD ---
// Tidak bergantung pada timezone browser/server (Vercel berjalan di UTC).
export function getWitaDateStr(now: Date = new Date()): string {
  return new Date(now.getTime() + WITA_OFFSET_HOURS * 3600 * 1000).toISOString().slice(0, 10);
}

// --- Tambah/kurangi hari pada string YYYY-MM-DD, tanpa efek timezone ---
export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface AssetForSnapshot {
  status: string | null;
  is_active: boolean | null;
  location_id: string | null;
}

export interface SnapshotRow {
  snapshot_date: string;
  location_id: string;
  beroperasi: number;
  idle: number;
  pemeliharaan: number;
  perbaikan: number;
  rusak: number;
  total: number;
  source: "live";
  updated_at: string;
}

// Kolom unik tabel asset_status_snapshots -> dipakai di .upsert({ onConflict })
export const SNAPSHOT_CONFLICT_KEY = "snapshot_date,location_id";

// --- Ubah daftar aset menjadi baris snapshot per lokasi ---
// Aturan:
//  - Aset nonaktif (is_active === false) TIDAK dihitung.
//  - Aset tanpa lokasi DILEWATI (kalau ikut disimpan dengan location_id NULL, upsert tidak
//    akan menimpa baris lama karena NULL dianggap berbeda di unique key -> baris dobel).
//  - source WAJIB "live", karena trigger trg_assets_recompute_snapshots menimpa baris lain.
export function buildSnapshotRows(assets: AssetForSnapshot[], snapshotDate: string): SnapshotRow[] {
  const byLocation = new Map<string, Omit<SnapshotRow, "snapshot_date" | "location_id" | "source" | "updated_at">>();

  for (const a of assets) {
    if (a.is_active === false) continue;
    if (!a.location_id) continue;

    const entry = byLocation.get(a.location_id) || {
      beroperasi: 0, idle: 0, pemeliharaan: 0, perbaikan: 0, rusak: 0, total: 0,
    };
    entry.total += 1;
    if (a.status === "Beroperasi") entry.beroperasi += 1;
    else if (a.status === "Idle") entry.idle += 1;
    else if (a.status === "Pemeliharaan") entry.pemeliharaan += 1;
    else if (a.status === "Perbaikan") entry.perbaikan += 1;
    else if (a.status === "Rusak") entry.rusak += 1;
    byLocation.set(a.location_id, entry);
  }

  const updatedAt = new Date().toISOString();
  return Array.from(byLocation.entries()).map(([location_id, c]) => ({
    snapshot_date: snapshotDate,
    location_id,
    ...c,
    source: "live" as const,
    updated_at: updatedAt,
  }));
}