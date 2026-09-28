"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Wallet, Banknote } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { isPathAllowedForRole } from "@/lib/auth";
import { DictionaryKey } from "@/lib/i18n/dictionary";
import {
  fetchAllCostTransactions,
  fetchAllBudgets,
  CostTransaction,
  CompanyBudgetRow,
} from "@/lib/costQueries";

// Nama bulan (Bahasa Indonesia) dipakai sebagai bagian key dictionary "availChart.bulan.<Nama>"
const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface CostPoint {
  year: number;
  month: number; // 0-11
  amount: number;
}

// Persentase = realisasi / anggaran. null jika anggaran belum diatur (0).
const pctOf = (realisasi: number, anggaran: number): number | null =>
  anggaran > 0 ? (realisasi / anggaran) * 100 : null;

interface SummaryRow {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}

function SummaryCard({
  subtitle,
  icon,
  rows,
  footer,
  onClick,
}: {
  subtitle: string;
  icon: React.ReactNode;
  rows: SummaryRow[];
  footer: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-5 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-4 transition-shadow duration-300 hover:shadow-md hover:border-[#0D9488]/30 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex justify-between items-center text-[#94A3B8]">
        <span className="text-sm font-bold uppercase tracking-wider">{subtitle}</span>
        <div className="w-9 h-9 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488] dark:text-[#37BAAE]">
          {icon}
        </div>
      </div>

      <div className="flex flex-col divide-y divide-gray-50 dark:divide-[#334155]">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">{row.label}</span>
            <span
              className={`font-black ${
                row.highlight ? "text-3xl text-[#0D9488] dark:text-[#37BAAE]" : "text-xl text-[#0F172A] dark:text-[#F8FAFC]"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 border-t border-gray-50 dark:border-[#334155] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-[#0D9488]">
        {footer}
      </div>
    </div>
  );
}

export default function BudgetSummaryCards() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [costs, setCosts] = useState<CostTransaction[]>([]);
  const [budgets, setBudgets] = useState<CompanyBudgetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const locale = lang === "en" ? "en-US" : "id-ID";
  const formatRupiah = (n: number) => `Rp ${n.toLocaleString(locale)}`;

  // --- AMBIL DATA SEKALI (seluruh transaksi biaya + seluruh anggaran); filter bulan/tahun dilakukan di sini ---
  // Pakai fungsi yang SAMA dengan halaman Analisis Biaya (lib/costQueries.ts), jadi angkanya konsisten.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, b] = await Promise.all([fetchAllCostTransactions(), fetchAllBudgets()]);
        if (cancelled) return;
        setCosts(c);
        setBudgets(b);
      } catch (err) {
        console.error("Gagal memuat ringkasan keuangan:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const costPoints = useMemo<CostPoint[]>(() => {
    const points: CostPoint[] = [];
    costs.forEach((c) => {
      const d = new Date(c.date);
      if (isNaN(d.getTime())) return;
      points.push({ year: d.getFullYear(), month: d.getMonth(), amount: c.amount || 0 });
    });
    return points;
  }, [costs]);

  // --- PILIHAN TAHUN: tahun berjalan + tahun yang punya data anggaran/biaya ---
  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear(), year]);
    budgets.forEach((b) => years.add(b.year));
    costPoints.forEach((p) => years.add(p.year));
    return Array.from(years).sort((a, b) => b - a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets, costPoints, year]);

  // --- HITUNG ANGKA UNTUK BULAN & TAHUN TERPILIH ---
  // TODO (rumus belum final): "Realisasi/Rekapitulasi" sementara = total 4 kategori biaya
  // (Pemeliharaan, Perbaikan, Pembelian Stok, Pembelian Aset) dari fetchAllCostTransactions.
  // Kalau rumus final sudah ditentukan, cukup ubah dua baris `realisasiBulan` & `realisasiSd` di bawah.
  const anggaranBulan = budgets.find((b) => b.year === year && b.month === month + 1)?.amount || 0;
  const realisasiBulan = costPoints
    .filter((p) => p.year === year && p.month === month)
    .reduce((sum, p) => sum + p.amount, 0);

  const anggaranSd = budgets
    .filter((b) => b.year === year && b.month <= month + 1)
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const realisasiSd = costPoints
    .filter((p) => p.year === year && p.month <= month)
    .reduce((sum, p) => sum + p.amount, 0);

  const pctBulan = pctOf(realisasiBulan, anggaranBulan);
  const pctSd = pctOf(realisasiSd, anggaranSd);

  const monthLabel = `${t(`availChart.bulan.${monthNames[month]}` as DictionaryKey)} ${year}`;

  // --- TAMPILAN NILAI ---
  const notSet = <span className="italic text-[#94A3B8] text-base font-bold">{t("dashboard.belumDiatur")}</span>;
  const placeholder = "—";
  const showMoney = (n: number) => (isLoading ? placeholder : formatRupiah(n));
  const showBudget = (n: number) => (isLoading ? placeholder : n > 0 ? formatRupiah(n) : notSet);
  const showPct = (p: number | null) =>
    isLoading ? placeholder : p === null ? notSet : `${p.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;

  // --- AKSES LINK MENGIKUTI ROLE (sama seperti filter menu di Sidebar) ---
  const canDetail = !user || isPathAllowedForRole("/analisis-biaya", user.role);
  const canBudget = !user || isPathAllowedForRole("/anggaran", user.role);
  const goDetail = canDetail ? () => router.push("/analisis-biaya") : undefined;

  const footer = (
    <>
      {canDetail && <span>{t("dashboard.lihatRincianBiaya")} →</span>}
    </>
  );
  const footerWithBudget = (
    <>
      {canDetail && <span>{t("dashboard.lihatRincianBiaya")} →</span>}
      {canBudget && (
        <Link
          href="/anggaran"
          onClick={(e) => e.stopPropagation()}
          className="underline underline-offset-2 hover:text-[#0F766E]"
        >
          {t("dashboard.aturAnggaran")}
        </Link>
      )}
    </>
  );

  const selectClass =
    "appearance-none pl-4 pr-9 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary";

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER + DROPDOWN BULAN & TAHUN (dipakai oleh kedua card) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base uppercase tracking-wider">
            {t("dashboard.ringkasanKeuangan")}
          </h3>
          <p className="text-[#94A3B8] text-xs mt-1">{t("dashboard.ringkasanKeuanganDesc")}</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <select
              aria-label={t("dashboard.pilihBulan")}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={selectClass}
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx}>
                  {t(`availChart.bulan.${m}` as DictionaryKey)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>

          <div className="relative">
            <select
              aria-label={t("dashboard.pilihTahun")}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={selectClass}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD KIRI: PER BULAN */}
        <SummaryCard
          subtitle={t("dashboard.cardBulanan")}
          icon={<Wallet size={20} />}
          onClick={goDetail}
          footer={footerWithBudget}
          rows={[
            { label: t("dashboard.anggaranBulan", { month: monthLabel }), value: showBudget(anggaranBulan) },
            { label: t("dashboard.realisasiBulan", { month: monthLabel }), value: showMoney(realisasiBulan) },
            { label: t("dashboard.persentaseBulan", { month: monthLabel }), value: showPct(pctBulan), highlight: true },
          ]}
        />

        {/* CARD KANAN: KUMULATIF s.d BULAN TERPILIH */}
        <SummaryCard
          subtitle={t("dashboard.cardKumulatif")}
          icon={<Banknote size={20} />}
          onClick={goDetail}
          footer={footer}
          rows={[
            { label: t("dashboard.anggaranSampaiBulan", { month: monthLabel }), value: showBudget(anggaranSd) },
            { label: t("dashboard.realisasiSampaiBulan", { month: monthLabel }), value: showMoney(realisasiSd) },
            { label: t("dashboard.persentaseSampaiBulan", { month: monthLabel }), value: showPct(pctSd), highlight: true },
          ]}
        />
      </div>
    </div>
  );
}