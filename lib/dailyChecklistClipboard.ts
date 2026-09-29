// lib/dailyChecklistClipboard.ts
//
// "Clipboard" sederhana untuk fitur salin-tempel Checklist Harian antar tanggal.
// Yang disimpan HANYA referensi (tanggal sumber + aset), bukan datanya -- data asli
// diambil dari database saat proses tempel, jadi selalu yang terbaru.
// Disimpan di localStorage supaya bertahan saat pindah halaman (daftar <-> form aset).

import { getWitaDateStr } from "@/lib/assetSnapshot";

export type DailyChecklistClipboard =
  | { scope: "asset"; sourceDate: string; assetId: string; category: string | null }
  | { scope: "day"; sourceDate: string };

const KEY = "dailyChecklistClipboard";

export function getChecklistClipboard(): DailyChecklistClipboard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DailyChecklistClipboard) : null;
  } catch {
    return null;
  }
}

export function setChecklistClipboard(value: DailyChecklistClipboard) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* localStorage tidak tersedia -> fitur salin tidak berfungsi, tapi halaman tetap jalan */
  }
}

export function clearChecklistClipboard() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

export function isValidDateStr(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + "T00:00:00Z").getTime());
}

// Tanggal checklist dari parameter URL ?date=. Tidak valid / kosong -> hari ini (WITA).
// Tanggal MASA DEPAN dipotong ke hari ini, karena checklist kondisi harian tidak boleh
// diisi untuk hari yang belum terjadi. `clamped` = true kalau tanggal dari URL dipotong.
export function resolveChecklistDate(param: string | null, today: string = getWitaDateStr()) {
  if (!isValidDateStr(param)) return { date: today, clamped: false };
  if (param > today) return { date: today, clamped: true };
  return { date: param, clamped: false };
}

export function formatTanggalPanjang(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}