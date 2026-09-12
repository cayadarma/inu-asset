"use client";

import React, { useState, useEffect } from "react";
import { HeartPulse, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import Pagination from "@/components/ui/Pagination";
import { BukuSakitReport, formatDurationHours } from "@/lib/reportQueries";

interface BukuSakitSectionProps {
  data: BukuSakitReport | null;
  isLoading: boolean;
}

const PAGE_SIZE = 10;

const urgencyStyle: Record<string, string> = {
  Tinggi: "bg-[#FEE2E2] text-[#991B1B]",
  Sedang: "bg-[#FFF7D6] text-[#E28E00]",
  Rendah: "bg-[#D1FAE5] text-[#065F46]",
};

export default function BukuSakitSection({ data, isLoading }: BukuSakitSectionProps) {
  const [pageProblematic, setPageProblematic] = useState(1);
  const [pageDetail, setPageDetail] = useState(1);

  useEffect(() => {
    setPageProblematic(1);
    setPageDetail(1);
  }, [data]);

  const topProblematicAssets = data?.topProblematicAssets ?? [];
  const detailRows = data?.detailRows ?? [];

  const pagedProblematic = topProblematicAssets.slice((pageProblematic - 1) * PAGE_SIZE, pageProblematic * PAGE_SIZE);
  const pagedDetail = detailRows.slice((pageDetail - 1) * PAGE_SIZE, pageDetail * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <HeartPulse size={18} className="text-[#0D9488]" />
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg">Buku Sakit / Histori Status Aset</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Total Entri Buku Sakit</span>
          <span className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">{isLoading ? "-" : data?.totalEntri ?? 0}</span>
        </div>
      </div>

      {/* ASET PALING BERMASALAH */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#334155] flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#EF4444]" />
          <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Aset Paling Sering Bermasalah</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Aset</th>
                <th className="px-6 py-3">Lokasi</th>
                <th className="px-6 py-3 text-center">Frekuensi Masuk Status Rusak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : topProblematicAssets.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada laporan kerusakan pada periode ini.</td></tr>
              ) : (
                pagedProblematic.map((a) => (
                  <tr key={a.assetId} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                    <td className="px-6 py-3 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{a.assetId} — {a.assetName}</td>
                    <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8]">{a.locationName}</td>
                    <td className="px-6 py-3 text-center font-bold text-[#EF4444]">{a.frekuensi}x</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && topProblematicAssets.length > 0 && (
          <Pagination currentPage={pageProblematic} totalCount={topProblematicAssets.length} itemsPerPage={PAGE_SIZE} onPageChange={setPageProblematic} itemLabel="aset" />
        )}
      </div>

      {/* HISTORI + ESTIMASI DURASI */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-[#334155]">
          <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Histori Laporan Kerusakan</h4>
        </div>

        <div className="mx-5 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          Kolom &quot;Estimasi Durasi&quot; dihitung dari selisih waktu laporan dibuat sampai Work Order terkait aset yang sama ditandai selesai.
          Ini perkiraan, bukan waktu penyelesaian yang dicatat langsung di Buku Sakit — tampil &quot;-&quot; jika tidak ditemukan Work Order pasangannya.
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Aset / Lokasi</th>
                <th className="px-6 py-3">Kejadian</th>
                <th className="px-6 py-3 text-center">Urgensi</th>
                <th className="px-6 py-3 text-center">Estimasi Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : detailRows.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada laporan kerusakan pada periode ini.</td></tr>
              ) : (
                pagedDetail.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                    <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8] font-medium">
                      {new Date(r.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{r.assetName}</p>
                      <p className="text-[11px] text-[#94A3B8]">{r.locationName}</p>
                    </td>
                    <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8] max-w-[240px] truncate">{r.issueTitle || "-"}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${urgencyStyle[r.urgency || ""] || "bg-gray-100 text-gray-600"}`}>
                        {r.urgency || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-[#475569] dark:text-[#94A3B8]">
                      {formatDurationHours(r.estimatedDurationHours)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && detailRows.length > 0 && (
          <Pagination currentPage={pageDetail} totalCount={detailRows.length} itemsPerPage={PAGE_SIZE} onPageChange={setPageDetail} itemLabel="laporan" />
        )}
      </div>
    </div>
  );
}