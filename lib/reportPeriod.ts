// lib/reportPeriod.ts
//
// Helper filter periode reusable untuk halaman Laporan.
// Mengikuti pola yang SUDAH ADA di components/ui/AvailabilityChart.tsx
// (getWeekStart, getWeekEnd, opsi periode Harian/Mingguan/Bulanan/Tahunan/Custom),
// supaya konsisten dengan komponen dashboard yang sudah dibuat sebelumnya.

export type PeriodMode = "Harian" | "Mingguan" | "Bulanan" | "Tahunan" | "Custom";

export const MONTH_OPTIONS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

export const PERIOD_MODES: PeriodMode[] = ["Harian", "Mingguan", "Bulanan", "Tahunan", "Custom"];

// --- Format tanggal ke YYYY-MM-DD tanpa efek pergeseran timezone ---
export function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// --- Sama persis dengan logic di AvailabilityChart.tsx: minggu dimulai hari Minggu ---
export function getWeekStart(dateStr: string): Date {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay(); // 0 = Minggu
  date.setDate(date.getDate() - day);
  return date;
}

export function getWeekEnd(dateStr: string): Date {
  const start = getWeekStart(dateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function formatTanggal(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// --- Parameter yang dibutuhkan tiap mode periode ---
export interface PeriodParams {
  mode: PeriodMode;
  selectedYear: number;       // dipakai mode Tahunan
  selectedMonth: string;      // dipakai mode Bulanan (nama bulan, ikut MONTH_OPTIONS)
  selectedMonthYear: number;  // tahun untuk mode Bulanan
  selectedWeekDate: string;   // acuan tanggal untuk mode Mingguan (YYYY-MM-DD)
  selectedDay: string;        // dipakai mode Harian (YYYY-MM-DD)
  customStart: string;        // dipakai mode Custom (YYYY-MM-DD)
  customEnd: string;          // dipakai mode Custom (YYYY-MM-DD)
}

export interface ResolvedPeriod {
  startDate: string; // YYYY-MM-DD, inklusif
  endDate: string;   // YYYY-MM-DD, inklusif
  label: string;     // teks ringkas untuk ditampilkan di UI, ex: "Menampilkan bulan Juni 2026"
}

// --- Nilai default yang aman dipakai saat komponen pertama kali render ---
export function getDefaultPeriodParams(): PeriodParams {
  const now = new Date();
  const todayStr = toDateStr(now);
  return {
    mode: "Bulanan",
    selectedYear: now.getFullYear(),
    selectedMonth: MONTH_OPTIONS[now.getMonth()],
    selectedMonthYear: now.getFullYear(),
    selectedWeekDate: todayStr,
    selectedDay: todayStr,
    customStart: todayStr,
    customEnd: todayStr,
  };
}

// --- Fungsi utama: ubah pilihan filter jadi rentang tanggal + label ---
export function resolvePeriod(params: PeriodParams): ResolvedPeriod {
  const { mode } = params;

  if (mode === "Harian") {
    const d = new Date(params.selectedDay + "T00:00:00");
    return {
      startDate: params.selectedDay,
      endDate: params.selectedDay,
      label: `Menampilkan tanggal ${formatTanggal(d)}`,
    };
  }

  if (mode === "Mingguan") {
    const start = getWeekStart(params.selectedWeekDate);
    const end = getWeekEnd(params.selectedWeekDate);
    return {
      startDate: toDateStr(start),
      endDate: toDateStr(end),
      label: `Menampilkan minggu ${formatTanggal(start)} — ${formatTanggal(end)}`,
    };
  }

  if (mode === "Bulanan") {
    const monthIndex = MONTH_OPTIONS.indexOf(params.selectedMonth as (typeof MONTH_OPTIONS)[number]);
    const year = params.selectedMonthYear;
    const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return {
      startDate: start,
      endDate: end,
      label: `Menampilkan bulan ${params.selectedMonth} ${year}`,
    };
  }

  if (mode === "Tahunan") {
    const year = params.selectedYear;
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      label: `Menampilkan tahun ${year}`,
    };
  }

  // mode === "Custom"
  const startD = new Date(params.customStart + "T00:00:00");
  const endD = new Date(params.customEnd + "T00:00:00");
  return {
    startDate: params.customStart,
    endDate: params.customEnd,
    label: `Menampilkan ${formatTanggal(startD)} s/d ${formatTanggal(endD)}`,
  };
}

// --- Helper kecil: cek apakah sebuah tanggal (ISO string / Date) ada dalam rentang [startDate, endDate] ---
export function isWithinPeriod(dateInput: string | Date | null | undefined, period: ResolvedPeriod): boolean {
  if (!dateInput) return false;
  const dateStr = typeof dateInput === "string" ? dateInput.slice(0, 10) : toDateStr(dateInput);
  return dateStr >= period.startDate && dateStr <= period.endDate;
}