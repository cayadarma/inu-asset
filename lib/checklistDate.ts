// lib/checklistDate.ts
//
// Helper tanggal untuk halaman Checklist Harian.
// Tanggal checklist dibawa lewat parameter URL ?date=YYYY-MM-DD (dari kalender
// Pemeliharaan Pencegahan atau dari pemilih tanggal di halaman Checklist Harian).

import { getWitaDateStr } from "@/lib/assetSnapshot";

export function isValidDateStr(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + "T00:00:00Z").getTime());
}

// Tanggal checklist dari parameter URL ?date=. Kosong/tidak valid -> hari ini (WITA).
// Tanggal LAMPAU tidak dibatasi (untuk mengisi checklist yang terlewat / data lama).
// Tanggal MASA DEPAN dipotong ke hari ini; `clamped` = true kalau tanggal dari URL dipotong.
export function resolveChecklistDate(param: string | null, today: string = getWitaDateStr()) {
  if (!isValidDateStr(param)) return { date: today, clamped: false };
  if (param > today) return { date: today, clamped: true };
  return { date: param, clamped: false };
}

export function formatTanggalPanjang(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}