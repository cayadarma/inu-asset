"use client";

import React, { useState } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { ChevronDown, MapPin, Calendar } from "lucide-react";

// Dummy Data dengan 4 Variabel Status
const data = [
  { name: "Jan", beroperasi: 1100, pemeliharaan: 120, perbaikan: 40, rusak: 15 },
  { name: "Feb", beroperasi: 1050, pemeliharaan: 150, perbaikan: 60, rusak: 25 },
  { name: "Mar", beroperasi: 1200, pemeliharaan: 100, perbaikan: 30, rusak: 10 },
  { name: "Apr", beroperasi: 1150, pemeliharaan: 130, perbaikan: 50, rusak: 20 },
  { name: "Mei", beroperasi: 1180, pemeliharaan: 110, perbaikan: 45, rusak: 12 },
  { name: "Jun", beroperasi: 1247, pemeliharaan: 80, perbaikan: 20, rusak: 5 },
  { name: "Jul", beroperasi: 1220, pemeliharaan: 140, perbaikan: 55, rusak: 18 },
  { name: "Agu", beroperasi: 1190, pemeliharaan: 160, perbaikan: 70, rusak: 22 },
  { name: "Sep", beroperasi: 1210, pemeliharaan: 120, perbaikan: 40, rusak: 14 },
  { name: "Okt", beroperasi: 1230, pemeliharaan: 100, perbaikan: 35, rusak: 10 },
  { name: "Nov", beroperasi: 1247, pemeliharaan: 90, perbaikan: 25, rusak: 8 },
  { name: "Des", beroperasi: 1240, pemeliharaan: 110, perbaikan: 30, rusak: 12 },
];

// --- DAFTAR TAHUN & BULAN UNTUK FILTER (STATIS, MENGIKUTI DATA DUMMY) ---
const yearOptions = [2022, 2023, 2024, 2025];
const monthOptions = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const todayStr = new Date().toISOString().slice(0, 10);

export default function AvailabilityChart() {
  const [location, setLocation] = useState("Semua Lokasi");
  const [period, setPeriod] = useState("Bulanan");

  // --- STATE KHUSUS PER JENIS PERIODE ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[new Date().getMonth()]);
  const [selectedWeekDate, setSelectedWeekDate] = useState(todayStr); // acuan tanggal, minggu dimulai hari Minggu
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

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

  return (
    <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm min-h-[500px] flex flex-col gap-8 transition-all duration-300">
      
      {/* 1. HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Tren Ketersediaan Aset</h3>
          <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Monitoring Status {period}</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          {/* Filter Tempat (TETAP DIPERTAHANKAN) */}
          <div className="relative flex-1 md:flex-none">
            <select 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full appearance-none pl-10 pr-10 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
            >
              <option>Semua Lokasi</option>
              <option>LAGOON</option>
              <option>LPS 1</option>
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

          {/* BULANAN: pilih bulan */}
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
                onChange={(e) => setCustomEnd(e.target.value)}
                className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* KETERANGAN RENTANG YANG SEDANG DIPILIH (SUPAYA JELAS APA YANG SEDANG DILIHAT) */}
      <div className="text-xs font-bold text-[#0D9488] -mt-4">
        {period === "Tahunan" && `Menampilkan tahun ${selectedYear}`}
        {period === "Bulanan" && `Menampilkan bulan ${selectedMonth}`}
        {period === "Mingguan" && `Menampilkan minggu ${formatTanggal(getWeekStart(selectedWeekDate))} — ${formatTanggal(getWeekEnd(selectedWeekDate))}`}
        {period === "Harian" && `Menampilkan tanggal ${formatTanggal(new Date(selectedDay + "T00:00:00"))}`}
        {period === "Custom" && `Menampilkan ${formatTanggal(new Date(customStart + "T00:00:00"))} s/d ${formatTanggal(new Date(customEnd + "T00:00:00"))}`}
      </div>

      {/* 2. AREA GRAFIK (4 SEKTOR) — DATA DUMMY TETAP DIPERTAHANKAN */}
      <div className="h-[320px] w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Gradient Warna Hijau */}
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
              domain={['auto', 'auto']} // SKALA DINAMIS (Anti-Jomplang)
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

            {/* SEKTOR 1: BEROPERASI (HIJAU) */}
            <Area 
              type="monotone" 
              dataKey="beroperasi" 
              stroke="#10B981" 
              strokeWidth={4} 
              fillOpacity={1} 
              fill="url(#colorBeroperasi)" 
            />

            {/* SEKTOR 2: PEMELIHARAAN (KUNING) */}
            <Area type="monotone" dataKey="pemeliharaan" stroke="#F59E0B" strokeWidth={3} fill="transparent" />

            {/* SEKTOR 3: PERBAIKAN (ORANYE) */}
            <Area type="monotone" dataKey="perbaikan" stroke="#F97316" strokeWidth={3} fill="transparent" />

            {/* SEKTOR 4: RUSAK (MERAH) */}
            <Area type="monotone" dataKey="rusak" stroke="#EF4444" strokeWidth={3} fill="transparent" />

          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3. LEGENDA KUSTOM DI BAWAH */}
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 pt-4 border-t dark:border-[#334155]">
        <CustomLegend color="#10B981" label="Beroperasi" />
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