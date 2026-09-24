import { Lang } from "./dictionary";

// Nilai-nilai berikut tersimpan di database dalam Bahasa Indonesia (nilai tetap/enum,
// BUKAN teks bebas). Karena jumlahnya terbatas & pasti, translate-nya manual di sini,
// tidak perlu lewat DeepL (lebih cepat, gratis, dan hasilnya konsisten/terkontrol).
//
// PENTING: value di sisi kiri (key) HARUS persis sama dengan yang tersimpan di DB,
// karena dipakai juga untuk logika filter/kondisi (bukan cuma tampilan).
const enumDictionary: Record<string, { id: string; en: string }> = {
  // Status Aset
  "Beroperasi": { id: "Beroperasi", en: "Operating" },
  "Rusak": { id: "Rusak", en: "Damaged" },
  "Perbaikan": { id: "Perbaikan", en: "Under Repair" },
  "Standby": { id: "Standby", en: "Standby" },
  "Idle": { id: "Idle", en: "Idle" },
  "Pemeliharaan": { id: "Pemeliharaan", en: "Maintenance" },
  "Nonaktif": { id: "Nonaktif", en: "Inactive" },
  "Semua Status": { id: "Semua Status", en: "All Status" },
  "Semua Tipe": { id: "Semua Tipe", en: "All Types" },
  "Semua Lokasi": { id: "Semua Lokasi", en: "All Locations" },

  // Status Work Order (Pemeliharaan Korektif)
  "Selesai": { id: "Selesai", en: "Completed" },
  "Menunggu Part": { id: "Menunggu Part", en: "Awaiting Parts" },
  "Dalam Proses": { id: "Dalam Proses", en: "In Progress" },
};

/**
 * Terjemahkan satu nilai enum (status aset, dll) untuk ditampilkan ke user.
 * Kalau value tidak dikenal di dictionary, kembalikan apa adanya (fallback aman).
 */
export function translateEnum(value: string | null | undefined, lang: Lang): string {
  if (!value) return "";
  const entry = enumDictionary[value];
  if (!entry) return value;
  return lang === "en" ? entry.en : entry.id;
}