"use client";

import React, { useState, useEffect } from "react";
import { Wrench, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import { CorrectiveMaintenanceReport, formatDurationHours } from "@/lib/reportQueries";

interface CorrectiveSectionProps {
  data: CorrectiveMaintenanceReport | null;
  isLoading: boolean;
}

const PAGE_SIZE = 10;

const formatRupiah = (n: number | null) => (n ? `Rp ${n.toLocaleString("id-ID")}` : "-");

export default function CorrectiveSection({ data, isLoading }: CorrectiveSectionProps) {
  const [pageLokasi, setPageLokasi] = useState(1);
  const [pageDamaged, setPageDamaged] = useState(1);
  const [pageDetail, setPageDetail] = useState(1);

  // --- RESET SEMUA HALAMAN KE 1 SETIAP KALI PERIODE/DATA BERUBAH ---
  useEffect(() => {
    setPageLokasi(1);
    setPageDamaged(1);
    setPageDetail(1);
  }, [data]);

  const byLocation = data?.byLocation ?? [];
  const topDamagedAssets = data?.topDamagedAssets ?? [];
  const detailRows = data?.detailRows ?? [];

  const pagedLokasi = byLocation.slice((pageLokasi - 1) * PAGE_SIZE, pageLokasi * PAGE_SIZE);
  const pagedDamaged = topDamagedAssets.slice((pageDamaged - 1) * PAGE_SIZE, pageDamaged * PAGE_SIZE);
  const pagedDetail = detailRows.slice((pageDetail - 1) * PAGE_SIZE, pageDetail * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Wrench size={18} className="text-[#0D9488]" />
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg">Corrective Maintenance</h3>
      </div>

      {/* RINGKASAN CARD */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <MiniStat label="Total WO" value={isLoading ? "-" : data?.totalWO ?? 0} />
        <MiniStat label="Selesai" value={isLoading ? "-" : data?.byStatus.selesai ?? 0} color="text-[#10B981]" />
        <MiniStat label="Dalam Proses" value={isLoading ? "-" : data?.byStatus.proses ?? 0} color="text-[#3B82F6]" />
        <MiniStat label="Menunggu Part" value={isLoading ? "-" : data?.byStatus.pending ?? 0} color="text-[#F59E0B]" />
        <MiniStat label="MTTR" value={isLoading ? "-" : formatDurationHours(data?.mttrHours ?? null)} />
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
                <th className="px-6 py-3 text-center">Total WO</th>
                <th className="px-6 py-3 text-center">Selesai</th>
                <th className="px-6 py-3 text-center">MTTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : byLocation.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada Work Order pada periode ini.</td></tr>
              ) : (
                pagedLokasi.map((loc) => (
                  <tr key={loc.locationName} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                    <td className="px-6 py-3 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{loc.locationName}</td>
                    <td className="px-6 py-3 text-center">{loc.total}</td>
                    <td className="px-6 py-3 text-center text-[#10B981] font-bold">{loc.selesai}</td>
                    <td className="px-6 py-3 text-center text-[#475569] dark:text-[#94A3B8]">{formatDurationHours(loc.mttrHours)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && byLocation.length > 0 && (
          <Pagination currentPage={pageLokasi} totalCount={byLocation.length} itemsPerPage={PAGE_SIZE} onPageChange={setPageLokasi} itemLabel="lokasi" />
        )}
      </div>

      {/* ASET DENGAN LAPORAN KERUSAKAN TERBANYAK */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#334155] flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#EF4444]" />
          <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Aset dengan Laporan Kerusakan Terbanyak</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Aset</th>
                <th className="px-6 py-3">Lokasi</th>
                <th className="px-6 py-3 text-center">Jumlah Laporan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : topDamagedAssets.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada laporan kerusakan pada periode ini.</td></tr>
              ) : (
                pagedDamaged.map((a) => (
                  <tr key={a.assetId} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                    <td className="px-6 py-3 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{a.assetId} — {a.assetName}</td>
                    <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8]">{a.locationName}</td>
                    <td className="px-6 py-3 text-center font-bold text-[#EF4444]">{a.jumlahLaporan}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && topDamagedAssets.length > 0 && (
          <Pagination currentPage={pageDamaged} totalCount={topDamagedAssets.length} itemsPerPage={PAGE_SIZE} onPageChange={setPageDamaged} itemLabel="aset" />
        )}
      </div>

      {/* TABEL DETAIL WO */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#334155]">
          <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Detail Work Order</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">ID WO</th>
                <th className="px-6 py-3">Aset / Lokasi</th>
                <th className="px-6 py-3">Kejadian</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : detailRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada Work Order pada periode ini.</td></tr>
              ) : (
                pagedDetail.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                    <td className="px-6 py-3 font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      <Link href={`/pemeliharaan/korektif/${wo.id}`} className="hover:text-[#0D9488]">{wo.id}</Link>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">{wo.assetName}</p>
                      <p className="text-[11px] text-[#94A3B8]">{wo.locationName}</p>
                    </td>
                    <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8] max-w-[240px] truncate">{wo.trouble || "-"}</td>
                    <td className="px-6 py-3 text-center"><Badge status={wo.status} /></td>
                    <td className="px-6 py-3 text-right font-bold text-[#0F172A] dark:text-[#F8FAFC]">{formatRupiah(wo.actualCost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && detailRows.length > 0 && (
          <Pagination currentPage={pageDetail} totalCount={detailRows.length} itemsPerPage={PAGE_SIZE} onPageChange={setPageDetail} itemLabel="work order" />
        )}
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