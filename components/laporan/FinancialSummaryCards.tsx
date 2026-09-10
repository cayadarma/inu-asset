"use client";

import React from "react";
import { Banknote, Wrench, Package, ClipboardCheck, Boxes, TrendingUp, TrendingDown } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { FinancialReport } from "@/lib/reportFinance";
import { CostCategory } from "@/lib/costQueries";

interface FinancialSummaryCardsProps {
  data: FinancialReport | null;
  isLoading: boolean;
}

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// --- Konfigurasi 4 kategori, warna & ikon SAMA dengan app/analisis-biaya/page.tsx supaya konsisten ---
const CATEGORY_META: { key: CostCategory; label: string; icon: any }[] = [
  { key: "Pemeliharaan", label: "Biaya Pemeliharaan", icon: ClipboardCheck },
  { key: "Perbaikan", label: "Biaya Perbaikan", icon: Wrench },
  { key: "Pembelian Stok", label: "Biaya Pembelian Stok", icon: Package },
  { key: "Pembelian Aset", label: "Biaya Pembelian Aset", icon: Boxes },
];

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
            <span>Pemeliharaan + Perbaikan + Pembelian Stok + Pembelian Aset</span>
            {!isLoading && data && <YoyText pct={data.yoyByCategory["ALL"] || 0} />}
          </div>
        }
      />

      {CATEGORY_META.map((c) => {
        const Icon = c.icon;
        const total = data?.totalsByCategory[c.key] ?? 0;
        const pct = data && data.totalKeseluruhan > 0 ? Math.round((total / data.totalKeseluruhan) * 100) : 0;
        return (
          <StatCard
            key={c.key}
            title={c.label}
            icon={<Icon size={18} />}
            value={dash ?? formatRupiah(total)}
            description={
              <div className="flex flex-col gap-1">
                <span>{pct}% dari total biaya pada periode ini</span>
                {!isLoading && data && <YoyText pct={data.yoyByCategory[c.key] || 0} />}
              </div>
            }
          />
        );
      })}
    </div>
  );
}