"use client";

import React from "react";
import { ClipboardCheck, MapPin } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { PreventiveMaintenanceReport } from "@/lib/reportQueries";

interface PreventiveSectionProps {
  data: PreventiveMaintenanceReport | null;
  isLoading: boolean;
}

export default function PreventiveSection({ data, isLoading }: PreventiveSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={18} className="text-[#0D9488]" />
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg">Preventive Maintenance</h3>
      </div>

      {/* RINGKASAN CARD */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <MiniStat label="Total Jadwal" value={isLoading ? "-" : data?.totalJadwal ?? 0} />
        <MiniStat label="Selesai" value={isLoading ? "-" : data?.selesai ?? 0} color="text-[#10B981]" />
        <MiniStat label="Berlangsung" value={isLoading ? "-" : data?.berlangsung ?? 0} color="text-[#F59E0B]" />
        <MiniStat label="Terlambat" value={isLoading ? "-" : data?.terlambat ?? 0} color="text-[#EF4444]" />
        <MiniStat
          label="Completion Rate"
          value={isLoading ? "-" : `${(data?.completionRatePct ?? 0).toFixed(0)}%`}
          color="text-[#0D9488]"
        />
      </div>

      {/* BREAKDOWN LOKASI */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#334155] flex items-center gap-2">
          <MapPin size={16} className="text-[#94A3B8]" />
          <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Breakdown per Lokasi</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Lokasi</th>
                <th className="px-6 py-3 text-center">Total Jadwal</th>
                <th className="px-6 py-3 text-center">Selesai</th>
                <th className="px-6 py-3 text-center">Terlambat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : !data || data.byLocation.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada jadwal pemeliharaan pada periode ini.</td></tr>
              ) : (
                data.byLocation.map((loc) => (
                  <tr key={loc.locationName} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                    <td className="px-6 py-3 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{loc.locationName}</td>
                    <td className="px-6 py-3 text-center">{loc.total}</td>
                    <td className="px-6 py-3 text-center text-[#10B981] font-bold">{loc.selesai}</td>
                    <td className="px-6 py-3 text-center text-[#EF4444] font-bold">{loc.terlambat}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABEL DETAIL JADWAL */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#334155]">
          <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Detail Jadwal Pemeliharaan</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Aset / Lokasi</th>
                <th className="px-6 py-3">Operator</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : !data || data.detailRows.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada jadwal pemeliharaan pada periode ini.</td></tr>
              ) : (
                data.detailRows.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                    <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8] font-medium">
                      {new Date(s.scheduledDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/pemeliharaan/checklist/${s.id}`} className="font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#0D9488]">
                        {s.assetName}
                      </Link>
                      <p className="text-[11px] text-[#94A3B8]">{s.locationName}</p>
                    </td>
                    <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8]">{s.operatorName || <span className="italic text-[#94A3B8]">Belum ditentukan</span>}</td>
                    <td className="px-6 py-3 text-center"><Badge status={s.displayStatus} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
      <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">{label}</span>
      <span className={`text-xl font-black ${color || "text-[#0F172A] dark:text-[#F8FAFC]"}`}>{value}</span>
    </div>
  );
}