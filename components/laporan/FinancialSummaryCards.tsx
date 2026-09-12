"use client";

import React from "react";
import { Banknote, TrendingUp, TrendingDown } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { FinancialReport } from "@/lib/reportFinance";

interface FinancialSummaryCardsProps {
  data: FinancialReport | null;
  isLoading: boolean;
}

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

function YoyText({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-[11px] text-[#94A3B8]">Sama seperti tahun lalu</span>;
  const isUp = pct > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isUp ? "text-[#EF4444]" : "text-[#10B981]"}`}>
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(pct)}% dari tahun {"lalu"}
    </span>
  );
}

export default function FinancialSummaryCards({ data, isLoading }: FinancialSummaryCardsProps) {
  const dash = isLoading ? "-" : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      <StatCard
        title="Total Biaya Keseluruhan"
        icon={<Banknote size={18} />}
        value={dash ?? formatRupiah(data?.totalKeseluruhan ?? 0)}
        description={
          <div className="flex flex-col gap-1">
            <span>Pemeliharaan + Perbaikan + Pembelian Stok + Pembelian Aset pada periode ini</span>
            {!isLoading && data && <YoyText pct={data.yoyByCategory["ALL"] || 0} />}
          </div>
        }
      />
    </div>
  );
}