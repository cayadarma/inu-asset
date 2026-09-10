"use client";

import React from "react";
import { Wallet, AlertCircle } from "lucide-react";
import Link from "next/link";
import { FinancialReport } from "@/lib/reportFinance";

interface BudgetRealizationProps {
  data: FinancialReport | null;
  isLoading: boolean;
}

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function BudgetRealization({ data, isLoading }: BudgetRealizationProps) {
  const belumDiset = data?.budgetMonths.filter((m) => m.amount === 0) || [];
  const barPct = Math.min(data?.realisasiPct ?? 0, 100);
  const isOver = (data?.realisasiPct ?? 0) >= 100;

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-[#334155] flex items-center gap-2">
        <Wallet size={16} className="text-[#94A3B8]" />
        <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Anggaran vs Realisasi</h4>
      </div>

      <div className="p-6 flex flex-col gap-5">
        {isLoading ? (
          <p className="text-center text-[#94A3B8] italic text-sm py-4">Memuat data...</p>
        ) : !data || data.budgetTotal === 0 ? (
          <div className="flex items-start gap-2 text-[12px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              Anggaran belum diset untuk periode ini. Realisasi biaya tetap dihitung ({formatRupiah(data?.totalKeseluruhan ?? 0)}),
              tapi persentase serapan tidak bisa ditampilkan.{" "}
              <Link href="/anggaran" className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100">
                Set anggaran di sini
              </Link>
              .
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Total Anggaran</p>
                <p className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">{formatRupiah(data.budgetTotal)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Realisasi Biaya</p>
                <p className={`text-xl font-black ${isOver ? "text-[#EF4444]" : "text-[#0D9488]"}`}>
                  {formatRupiah(data.totalKeseluruhan)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="w-full h-3 bg-gray-100 dark:bg-[#0F172A] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOver ? "bg-[#EF4444]" : data.realisasiPct >= 80 ? "bg-[#F59E0B]" : "bg-[#0D9488]"}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <p className={`text-xs font-bold ${isOver ? "text-[#EF4444]" : "text-[#475569] dark:text-[#94A3B8]"}`}>
                {data.realisasiPct}% anggaran terpakai{isOver ? " — melebihi anggaran" : ""}
              </p>
            </div>

            {belumDiset.length > 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                Catatan: {belumDiset.map((m) => `${BULAN[m.month - 1]} ${m.year}`).join(", ")} belum ada anggaran diset (dihitung Rp 0).
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}