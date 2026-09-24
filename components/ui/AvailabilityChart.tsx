"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { ChevronDown, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- BENTUK 1 TITIK DATA DI GRAFIK ---
interface ChartPoint {
  name: string;
  beroperasi: number;
  idle: number;
  pemeliharaan: number;
  perbaikan: number;
  rusak: number;
}

// --- BENTUK 1 BARIS ASLI DARI TABEL asset_status_snapshots ---
interface SnapshotRow {
  snapshot_date: string; // YYYY-MM-DD
  location_id: string | null;
  beroperasi: number;
  idle: number;
  pemeliharaan: number;
  perbaikan: number;
  rusak: number;
}

interface LocationOption {
  id: string;
  name: string;
}

const ALL_LOCATIONS = "Semua Lokasi";
const EMPTY_POINT = { beroperasi: 0, idle: 0, pemeliharaan: 0, perbaikan: 0, rusak: 0 };

const monthOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const monthShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dayShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const todayStr = new Date().toISOString().slice(0, 10);
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

// --- Ambil SEMUA baris dari sebuah query, walau jumlahnya lebih dari batas default
// Supabase/PostgREST (1000 baris per request). Tanpa ini, rentang tanggal panjang
// (mis. mode Tahunan) diam-diam terpotong di baris ke-1000 -- karena data diurutkan
// ascending, yang kepotong adalah tanggal-tanggal PALING BARU, sehingga grafik terlihat
// "anjlok ke 0" di bulan-bulan belakangan padahal datanya sebenarnya ada.
// `queryFactory` menerima (from, to) dan HARUS memanggil .range(from, to) di ujungnya.
async function fetchAllPages<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFactory(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break; // halaman terakhir
    from += PAGE_SIZE;
  }

  return allRows;
}

export default function AvailabilityChart() {
  const [location, setLocation] = useState<string>(ALL_LOCATIONS); // ALL_LOCATIONS atau id lokasi
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [period, setPeriod] = useState("Bulanan");

  // --- STATE KHUSUS PER JENIS PERIODE ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[new Date().getMonth()]);
  const [selectedWeekDate, setSelectedWeekDate] = useState(todayStr); // acuan tanggal, minggu dimulai hari Minggu
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // --- STATE DATA ASLI ---
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [yearOptions, setYearOptions] = useState<number[]>([new Date().getFullYear()]);

  // --- AMBIL RENTANG TAHUN YANG BENERAN ADA DATANYA DI asset_status_snapshots ---
  useEffect(() => {
    async function loadYearRange() {
      const { data: earliest } = await supabase
        .from("asset_status_snapshots")
        .select("snapshot_date")
        .order("snapshot_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      const currentYear = new Date().getFullYear();
      const earliestYear = earliest?.snapshot_date
        ? new Date(earliest.snapshot_date + "T00:00:00").getFullYear()
        : currentYear;

      const years: number[] = [];
      for (let y = currentYear; y >= earliestYear; y--) years.push(y);
      setYearOptions(years);
    }
    loadYearRange();
  }, []);

  // --- AMBIL DAFTAR LOKASI ASLI UNTUK DROPDOWN FILTER ---
  useEffect(() => {
    async function loadLocations() {
      const { data } = await supabase.from("locations").select("id, name").order("name", { ascending: true });
      if (data) setLocationOptions(data as LocationOption[]);
    }
    loadLocations();
  }, []);

  // --- HITUNG TANGGAL AWAL MINGGU (HARI MINGGU) DARI TANGGAL ACUAN ---
  const getWeekStart = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDay(); // 0 = Minggu
    date.setDate(date.getDate() - day);
    return date;
  };
  const getWeekEnd = (dateStr: string) => {
    const start = getWeekStart(dateStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  };
  const formatTanggal = (d: Date) =>
    d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // --- AMBIL SNAPSHOT DARI SUPABASE UNTUK RENTANG TANGGAL TERTENTU ---
  // Kalau `location` = lokasi spesifik -> tinggal filter location_id, 1 baris per tanggal.
  // Kalau `location` = ALL_LOCATIONS -> jumlahkan semua baris berlokasi (location_id NOT NULL)
  // per tanggal. Untuk tanggal yang belum punya breakdown per lokasi sama sekali (histori
  // lama sebelum backfill per lokasi), fallback ke baris location_id NULL yang lama.
  const fetchSnapshots = async (start: string, end: string): Promise<Map<string, typeof EMPTY_POINT>> => {
    const rows = await fetchAllPages<SnapshotRow>((from, to) => {
      let query = supabase
        .from("asset_status_snapshots")
        .select("snapshot_date, location_id, beroperasi, idle, pemeliharaan, perbaikan, rusak")
        .gte("snapshot_date", start)
        .lte("snapshot_date", end)
        .order("snapshot_date", { ascending: true });

      if (location !== ALL_LOCATIONS) {
        query = query.eq("location_id", location);
      }

      return query.range(from, to);
    });

    const result = new Map<string, typeof EMPTY_POINT>();

    if (location !== ALL_LOCATIONS) {
      // Sudah pasti maksimal 1 baris per tanggal (unique constraint snapshot_date+location_id).
      rows.forEach((r) => {
        result.set(r.snapshot_date, { beroperasi: r.beroperasi, idle: r.idle, pemeliharaan: r.pemeliharaan, perbaikan: r.perbaikan, rusak: r.rusak });
      });
      return result;
    }

    // ALL_LOCATIONS: jumlahkan baris berlokasi per tanggal, fallback ke baris NULL kalau tidak ada.
    const perDate = new Map<string, { sum: typeof EMPTY_POINT; hasLocationRows: boolean; fallback?: typeof EMPTY_POINT }>();
    rows.forEach((r) => {
      const entry = perDate.get(r.snapshot_date) || { sum: { ...EMPTY_POINT }, hasLocationRows: false, fallback: undefined };
      if (r.location_id) {
        entry.hasLocationRows = true;
        entry.sum = {
          beroperasi: entry.sum.beroperasi + r.beroperasi,
          idle: entry.sum.idle + r.idle,
          pemeliharaan: entry.sum.pemeliharaan + r.pemeliharaan,
          perbaikan: entry.sum.perbaikan + r.perbaikan,
          rusak: entry.sum.rusak + r.rusak,
        };
      } else {
        entry.fallback = { beroperasi: r.beroperasi, idle: r.idle, pemeliharaan: r.pemeliharaan, perbaikan: r.perbaikan, rusak: r.rusak };
      }
      perDate.set(r.snapshot_date, entry);
    });

    perDate.forEach((entry, date) => {
      result.set(date, entry.hasLocationRows ? entry.sum : (entry.fallback || EMPTY_POINT));
    });
    return result;
  };

  // --- SUSUN DATA GRAFIK SESUAI JENIS PERIODE YANG DIPILIH ---
  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    const todayDate = new Date();
    const todayCapped = toDateStr(todayDate);
    let points: ChartPoint[] = [];

    if (period === "Tahunan") {
      // 12 titik (per bulan). Nilai tiap bulan diambil dari snapshot TERAKHIR
      // yang ada di bulan itu (mencerminkan kondisi di akhir bulan tsb).
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = selectedYear === todayDate.getFullYear() ? todayCapped : `${selectedYear}-12-31`;
      const byDate = await fetchSnapshots(yearStart, yearEnd);
      const datesSorted = Array.from(byDate.keys()).sort();

      points = monthShort.map((label, idx) => {
        const datesInMonth = datesSorted.filter((ds) => new Date(ds + "T00:00:00").getMonth() === idx);
        const lastDate = datesInMonth[datesInMonth.length - 1];
        return { name: label, ...(lastDate ? byDate.get(lastDate)! : EMPTY_POINT) };
      });
    } else if (period === "Bulanan") {
      // Titik per hari dalam bulan terpilih (tahun berjalan).
      const monthIndex = monthOptions.indexOf(selectedMonth);
      const year = todayDate.getFullYear();
      const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
      const isCurrentMonth = monthIndex === todayDate.getMonth() && year === todayDate.getFullYear();
      const daysToShow = isCurrentMonth ? todayDate.getDate() : lastDayOfMonth;

      const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
      const monthEnd = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;
      const byDate = await fetchSnapshots(monthStart, isCurrentMonth ? todayCapped : monthEnd);

      points = Array.from({ length: daysToShow }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return { name: String(day), ...(byDate.get(dateStr) || EMPTY_POINT) };
      });
    } else if (period === "Mingguan") {
      // 7 titik, per hari dalam minggu terpilih (Minggu - Sabtu).
      const weekStart = getWeekStart(selectedWeekDate);
      const weekEnd = getWeekEnd(selectedWeekDate);
      const byDate = await fetchSnapshots(toDateStr(weekStart), toDateStr(weekEnd) > todayCapped ? todayCapped : toDateStr(weekEnd));

      points = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const dateStr = toDateStr(d);
        return { name: dayShort[i], ...(byDate.get(dateStr) || EMPTY_POINT) };
      });
    } else if (period === "Harian") {
      // 1 titik: snapshot pada tanggal yang dipilih.
      const byDate = await fetchSnapshots(selectedDay, selectedDay);
      points = [{ name: formatTanggal(new Date(selectedDay + "T00:00:00")), ...(byDate.get(selectedDay) || EMPTY_POINT) }];
    } else if (period === "Custom") {
      // Titik per hari dalam rentang tanggal custom.
      const start = customStart;
      const end = customEnd > todayCapped ? todayCapped : customEnd;
      const byDate = await fetchSnapshots(start, end);

      const startDate = new Date(start + "T00:00:00");
      const endDate = new Date(end + "T00:00:00");
      const dayCount = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);

      points = Array.from({ length: dayCount }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = toDateStr(d);
        return { name: d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" }), ...(byDate.get(dateStr) || EMPTY_POINT) };
      });
    }

    setChartData(points);
    setIsLoading(false);
  }, [period, selectedYear, selectedMonth, selectedWeekDate, selectedDay, customStart, customEnd, location]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  return (
    <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm min-h-[500px] flex flex-col gap-8 transition-all duration-300">

      {/* 1. HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Tren Ketersediaan Aset</h3>
          <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Monitoring Status {period}</p>
          <p className="text-[#94A3B8] text-xs">Jumlah aset per kondisi dari waktu ke waktu</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          {/* Filter Tempat -- data asli dari tabel locations */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full appearance-none pl-10 pr-10 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
            >
              <option value={ALL_LOCATIONS}>Semua Lokasi</option>
              {locationOptions.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          </div>

          {/* Filter Jenis Periode */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full appearance-none pl-10 pr-10 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
            >
              <option>Harian</option>
              <option>Mingguan</option>
              <option>Bulanan</option>
              <option>Tahunan</option>
              <option>Custom</option>
            </select>
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          </div>

          {/* --- INPUT TAMBAHAN SESUAI JENIS PERIODE YANG DIPILIH --- */}

          {/* TAHUNAN: pilih tahun */}
          {period === "Tahunan" && (
            <div className="relative flex-1 md:flex-none">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full appearance-none pl-4 pr-9 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            </div>
          )}

          {/* BULANAN: pilih bulan (tahun berjalan) */}
          {period === "Bulanan" && (
            <div className="relative flex-1 md:flex-none">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none pl-4 pr-9 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
              >
                {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            </div>
          )}

          {/* MINGGUAN: pilih tanggal, minggu dimulai hari Minggu */}
          {period === "Mingguan" && (
            <input
              type="date"
              value={selectedWeekDate}
              onChange={(e) => setSelectedWeekDate(e.target.value)}
              className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
            />
          )}

          {/* HARIAN: pilih tanggal */}
          {period === "Harian" && (
            <input
              type="date"
              value={selectedDay}
              max={todayStr}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
            />
          )}

          {/* CUSTOM: pilih tanggal "dari" dan "sampai" */}
          {period === "Custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
              />
              <span className="text-[#94A3B8] text-xs font-bold">s/d</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* KETERANGAN RENTANG YANG SEDANG DIPILIH */}
      <div className="text-xs font-bold text-[#0D9488] -mt-4">
        {period === "Tahunan" && `Menampilkan tahun ${selectedYear}`}
        {period === "Bulanan" && `Menampilkan bulan ${selectedMonth} ${new Date().getFullYear()}`}
        {period === "Mingguan" && `Menampilkan minggu ${formatTanggal(getWeekStart(selectedWeekDate))} — ${formatTanggal(getWeekEnd(selectedWeekDate))}`}
        {period === "Harian" && `Menampilkan tanggal ${formatTanggal(new Date(selectedDay + "T00:00:00"))}`}
        {period === "Custom" && `Menampilkan ${formatTanggal(new Date(customStart + "T00:00:00"))} s/d ${formatTanggal(new Date(customEnd + "T00:00:00"))}`}
      </div>

      {/* 2. AREA GRAFIK -- DATA ASLI DARI asset_status_snapshots */}
      <div className="h-[320px] w-full -ml-4 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#94A3B8]">
            Memuat data...
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBeroperasi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-gray-800" />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}}
              dy={15}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}}
              domain={['auto', 'auto']}
              allowDecimals={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: 'none',
                borderRadius: '16px',
                color: '#fff',
                fontSize: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
              }}
            />

            <Area type="monotone" dataKey="beroperasi" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorBeroperasi)" />
            <Area type="monotone" dataKey="idle" stroke="#8B5CF6" strokeWidth={3} fill="transparent" />
            <Area type="monotone" dataKey="pemeliharaan" stroke="#F59E0B" strokeWidth={3} fill="transparent" />
            <Area type="monotone" dataKey="perbaikan" stroke="#F97316" strokeWidth={3} fill="transparent" />
            <Area type="monotone" dataKey="rusak" stroke="#EF4444" strokeWidth={3} fill="transparent" />

          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3. LEGENDA KUSTOM DI BAWAH */}
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 pt-4 border-t dark:border-[#334155]">
        <CustomLegend color="#10B981" label="Beroperasi" />
        <CustomLegend color="#8B5CF6" label="Idle" />
        <CustomLegend color="#F59E0B" label="Pemeliharaan" />
        <CustomLegend color="#F97316" label="Perbaikan" />
        <CustomLegend color="#EF4444" label="Rusak" />
      </div>

    </div>
  );
}

// Komponen Helper Legenda
function CustomLegend({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
      <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</span>
    </div>
  );
}