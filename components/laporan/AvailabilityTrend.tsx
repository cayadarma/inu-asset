"use client";

import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { AvailabilityTrendPoint } from "@/lib/reportQueries";

interface AvailabilityTrendProps {
  data: AvailabilityTrendPoint[];
  isLoading: boolean;
}

// --- Format label tanggal singkat untuk sumbu-X, contoh: "3 Jun" ---
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function CustomLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
      <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function AvailabilityTrend({ data, isLoading }: AvailabilityTrendProps) {
  const chartData = data.map((row) => ({ ...row, label: formatShortDate(row.date) }));

  return (
    <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm min-h-[500px] flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em]">Tren Ketersediaan Aset</h3>
        <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Monitoring Status Harian pada Periode Laporan</p>
        <p className="text-[#94A3B8] text-xs">
          Jumlah aset per kondisi berdasarkan snapshot harian pada periode yang sedang ditampilkan (data hari yang tidak sempat tercatat tidak akan muncul di grafik ini)
        </p>
      </div>

      <div className="h-[320px] w-full -ml-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm">Memuat data...</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm italic text-center px-8">
            Belum ada snapshot kondisi aset pada periode ini.
            <br />
            Snapshot tercatat otomatis setiap kali Dashboard dibuka.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBeroperasiReport" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-gray-800" />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 700 }}
                dy={15}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11, fontWeight: 700 }}
                domain={["auto", "auto"]}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#1E293B",
                  border: "none",
                  borderRadius: "16px",
                  color: "#fff",
                  fontSize: "12px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                }}
                labelFormatter={(label, payload) => {
                  const raw = payload?.[0]?.payload?.date;
                  return raw ? new Date(raw + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : label;
                }}
              />

              <Area type="monotone" dataKey="beroperasi" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorBeroperasiReport)" />
              <Area type="monotone" dataKey="idle" stroke="#8B5CF6" strokeWidth={3} fill="transparent" />
              <Area type="monotone" dataKey="pemeliharaan" stroke="#F59E0B" strokeWidth={3} fill="transparent" />
              <Area type="monotone" dataKey="perbaikan" stroke="#F97316" strokeWidth={3} fill="transparent" />
              <Area type="monotone" dataKey="rusak" stroke="#EF4444" strokeWidth={3} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!isLoading && chartData.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 pt-4 border-t dark:border-[#334155]">
          <CustomLegend color="#10B981" label="Beroperasi" />
          <CustomLegend color="#8B5CF6" label="Idle" />
          <CustomLegend color="#F59E0B" label="Pemeliharaan" />
          <CustomLegend color="#F97316" label="Perbaikan" />
          <CustomLegend color="#EF4444" label="Rusak" />
        </div>
      )}
    </div>
  );
}