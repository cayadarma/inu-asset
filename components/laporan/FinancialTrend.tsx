"use client";

import React from "react";
import { FinancialReport } from "@/lib/reportFinance";
import { CostCategory } from "@/lib/costQueries";

interface FinancialTrendProps {
  data: FinancialReport | null;
  isLoading: boolean;
}

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// --- Warna kategori SAMA dengan app/analisis-biaya/page.tsx supaya konsisten lintas halaman ---
const CATEGORY_COLORS: Record<CostCategory, string> = {
  Pemeliharaan: "#0D9488",
  Perbaikan: "#E28E00",
  "Pembelian Stok": "#3B82F6",
  "Pembelian Aset": "#8B5CF6",
};
const CATEGORY_ORDER: CostCategory[] = ["Pemeliharaan", "Perbaikan", "Pembelian Stok", "Pembelian Aset"];
const CHART_HEIGHT_PX = 200;

export default function FinancialTrend({ data, isLoading }: FinancialTrendProps) {
  const monthlyChart = data?.monthlyTrend || [];
  const maxMonthly = Math.max(1, ...monthlyChart.map((m) => CATEGORY_ORDER.reduce((s, c) => s + m[c], 0)));

  return (
    <div className="bg-white dark:bg-[#1E293B] p-4 sm:p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col min-h-[380px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base">
          Tren Biaya Bulanan {data ? `— ${data.focusYear}` : ""}
        </h3>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] font-bold">
          {CATEGORY_ORDER.map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-[#94A3B8]">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: CATEGORY_COLORS[c] }}></span>
              {c}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-[#94A3B8] text-sm">Memuat data...</div>
      ) : monthlyChart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#94A3B8] text-sm italic">Belum ada data biaya untuk ditampilkan.</div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-[220px] pt-4 border-b border-gray-50 dark:border-[#334155] pb-2 min-w-[560px] sm:min-w-0">
            {monthlyChart.map((m) => {
              const total = CATEGORY_ORDER.reduce((s, c) => s + m[c], 0);
              return (
                <div key={m.sortKey} className="flex-1 min-w-[36px] flex flex-col justify-end items-center gap-2 sm:gap-3 group">
                  <div className="w-full flex flex-col-reverse justify-start relative" style={{ height: CHART_HEIGHT_PX }}>
                    {CATEGORY_ORDER.map((c) => {
                      const h = Math.round((m[c] / maxMonthly) * CHART_HEIGHT_PX);
                      return (
                        <div
                          key={c}
                          style={{ height: `${h}px`, backgroundColor: CATEGORY_COLORS[c] }}
                          className="w-full hover:opacity-80 transition-all first:rounded-t-sm"
                        />
                      );
                    })}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                      {formatRupiah(total)}
                    </div>
                  </div>
                  <span className="text-[12px] text-[#94A3B8] font-bold">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}