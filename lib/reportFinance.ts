// lib/reportFinance.ts
//
// Agregator untuk Laporan Keuangan/Manajemen (Priority #8).
// Reuse PENUH logic yang sudah ada:
// - fetchAllCostTransactions() dari lib/costQueries.ts (SAMA PERSIS dengan app/analisis-biaya/page.tsx)
// - fetchAllBudgets() / getBudgetMonthsInRange() dari lib/costQueries.ts (company_budgets)
// Tidak ada query baru yang dibuat di sini — murni agregasi ulang berdasarkan ResolvedPeriod
// dari lib/reportPeriod.ts, mengikuti pola lib/reportQueries.ts (Laporan Operasional).

import { ResolvedPeriod } from "@/lib/reportPeriod";
import {
  fetchAllCostTransactions,
  fetchAllBudgets,
  getBudgetMonthsInRange,
  CostCategory,
  CostTransaction,
  COST_CATEGORIES,
  BudgetMonthEntry,
} from "@/lib/costQueries";

export interface MonthlyCostPoint {
  label: string; // "Jan", "Feb", dst
  sortKey: string; // "2026-01"
  Pemeliharaan: number;
  Perbaikan: number;
  "Pembelian Stok": number;
  "Pembelian Aset": number;
}

export interface FinancialReport {
  // --- Ringkasan sesuai rentang periode yang dipilih ---
  totalKeseluruhan: number;
  totalsByCategory: Record<CostCategory, number>;
  detailRows: CostTransaction[];

  // --- YoY: dibandingkan terhadap tahun sebelum tahun awal periode (mengikuti pola analisis-biaya) ---
  focusYear: number;
  yoyByCategory: Record<string, number>; // key kategori + "ALL", satuan persen

  // --- Tren bulanan (12 bulan penuh, tahun = focusYear) ---
  monthlyTrend: MonthlyCostPoint[];

  // --- Budget vs Realisasi (company_budgets) untuk bulan-bulan yang dilalui periode ---
  budgetMonths: BudgetMonthEntry[];
  budgetTotal: number;
  realisasiPct: number; // totalKeseluruhan / budgetTotal * 100, 0 jika budgetTotal = 0
}

const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const emptyCategoryTotals = (): Record<CostCategory, number> => ({
  Pemeliharaan: 0,
  Perbaikan: 0,
  "Pembelian Stok": 0,
  "Pembelian Aset": 0,
});

export async function fetchFinancialReport(period: ResolvedPeriod): Promise<FinancialReport> {
  const [allTransactions, allBudgets] = await Promise.all([
    fetchAllCostTransactions(),
    fetchAllBudgets(),
  ]);

  // --- Transaksi yang jatuh pada rentang periode (sama seperti filter di analisis-biaya) ---
  const detailRows = allTransactions.filter((tx) => {
    const txDate = tx.date?.slice(0, 10) || "";
    return txDate >= period.startDate && txDate <= period.endDate;
  });

  const totalsByCategory = emptyCategoryTotals();
  detailRows.forEach((tx) => {
    totalsByCategory[tx.category] += tx.amount;
  });
  const totalKeseluruhan = COST_CATEGORIES.reduce((s, c) => s + totalsByCategory[c], 0);

  // --- YoY: tahun acuan = tahun dari startDate periode (sama seperti "focusYear" di analisis-biaya) ---
  const focusYear = new Date(period.startDate + "T00:00:00").getFullYear();

  const sumForYear = (cat: CostCategory | "ALL", year: number) =>
    allTransactions
      .filter((tx) => (cat === "ALL" || tx.category === cat) && new Date(tx.date).getFullYear() === year)
      .reduce((s, tx) => s + tx.amount, 0);

  const calcPct = (thisYear: number, lastYear: number) => {
    if (lastYear === 0) return thisYear > 0 ? 100 : 0;
    return Math.round(((thisYear - lastYear) / lastYear) * 100);
  };

  const yoyByCategory: Record<string, number> = {};
  COST_CATEGORIES.forEach((c) => {
    yoyByCategory[c] = calcPct(sumForYear(c, focusYear), sumForYear(c, focusYear - 1));
  });
  yoyByCategory["ALL"] = calcPct(sumForYear("ALL", focusYear), sumForYear("ALL", focusYear - 1));

  // --- Tren bulanan (12 bulan penuh, tahun = focusYear) ---
  const monthlyTrend: MonthlyCostPoint[] = Array.from({ length: 12 }, (_, i) => ({
    label: BULAN_SINGKAT[i],
    sortKey: `${focusYear}-${String(i + 1).padStart(2, "0")}`,
    Pemeliharaan: 0,
    Perbaikan: 0,
    "Pembelian Stok": 0,
    "Pembelian Aset": 0,
  }));
  allTransactions.forEach((tx) => {
    const d = new Date(tx.date);
    if (d.getFullYear() !== focusYear) return;
    monthlyTrend[d.getMonth()][tx.category] += tx.amount;
  });

  // --- Budget vs Realisasi untuk bulan-bulan yang dilalui periode ---
  const budgetMonths = getBudgetMonthsInRange(allBudgets, period.startDate, period.endDate);
  const budgetTotal = budgetMonths.reduce((s, m) => s + m.amount, 0);
  const realisasiPct = budgetTotal > 0 ? Math.round((totalKeseluruhan / budgetTotal) * 100) : 0;

  return {
    totalKeseluruhan,
    totalsByCategory,
    detailRows,
    focusYear,
    yoyByCategory,
    monthlyTrend,
    budgetMonths,
    budgetTotal,
    realisasiPct,
  };
}