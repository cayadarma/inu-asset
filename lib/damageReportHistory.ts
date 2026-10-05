// lib/damageReportHistory.ts
//
// Aturan "data riwayat" untuk laporan kerusakan: laporan dengan tanggal kejadian yang sudah lama
// dianggap riwayat -> TIDAK mengirim email dan TIDAK mengubah status aset menjadi Rusak.

import { getWitaDateStr } from "@/lib/assetSnapshot";

// Lebih dari berapa hari yang lalu dianggap "lama"
export const HISTORY_THRESHOLD_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

// dateStr: format YYYY-MM-DD (value dari <input type="date">). Kosong -> bukan data lama.
export function isOldIncident(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = Date.parse(`${getWitaDateStr()}T00:00:00Z`);
  const incident = Date.parse(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(incident)) return false;
  return Math.floor((today - incident) / DAY_MS) > HISTORY_THRESHOLD_DAYS;
}