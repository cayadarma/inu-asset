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

export default function AvailabilityChart() {
  const [location, setLocation] = useState("Semua Lokasi");
  const [period, setPeriod] = useState("Bulanan");

  return (
    <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm h-[500px] flex flex-col gap-8 transition-all duration-300">
      
      {/* 1. HEADER & DUAL FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Tren Ketersediaan Aset</h3>
          <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Monitoring Status Bulanan</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Filter Tempat */}
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

          {/* Filter Tanggal */}
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
            </select>
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          </div>
        </div>
      </div>

      {/* 2. AREA GRAFIK (4 SEKTOR) */}
      <div className="flex-1 w-full -ml-4">
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