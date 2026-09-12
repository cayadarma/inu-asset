// lib/reportSections.ts
//
// Definisi "section" laporan yang bisa dipilih user lewat checklist di halaman
// preview (Langkah 6, poin 3). Dipakai bersama oleh:
// - app/laporan/preview/page.tsx  (panel checklist)
// - components/laporan/ReportTemplate.tsx (render kertas)
// - lib/reportExport.ts           (PDF & Excel export, supaya section yang
//   dicetak/diexport SAMA PERSIS dengan yang dicentang di preview)

export type ReportSectionKey =
  | "ringkasan"
  | "corrective"
  | "preventive"
  | "bukusakit"
  | "keuangan";

export interface ReportSectionDef {
  key: ReportSectionKey;
  label: string;
}

// Urutan di sini menentukan urutan tampil di kertas & di panel checklist.
export const REPORT_SECTIONS: ReportSectionDef[] = [
  { key: "ringkasan", label: "Ringkasan Operasional" },
  { key: "corrective", label: "Corrective Maintenance (Work Order)" },
  { key: "preventive", label: "Preventive Maintenance (Checklist)" },
  { key: "bukusakit", label: "Buku Sakit (Laporan Kerusakan)" },
  { key: "keuangan", label: "Ringkasan Keuangan" },
];

export type ReportSectionSelection = Record<ReportSectionKey, boolean>;

// Default: SEMUA TERCENTANG saat pertama kali halaman preview dibuka.
export function defaultReportSectionSelection(): ReportSectionSelection {
  return REPORT_SECTIONS.reduce((acc, s) => {
    acc[s.key] = true;
    return acc;
  }, {} as ReportSectionSelection);
}