"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import Link from "next/link";

import PeriodFilter from "@/components/laporan/PeriodFilter";
import SummaryCards from "@/components/laporan/SummaryCards";
import AvailabilityTrend from "@/components/laporan/AvailabilityTrend";
import CorrectiveSection from "@/components/laporan/CorrectiveSection";
import PreventiveSection from "@/components/laporan/PreventiveSection";
import BukuSakitSection from "@/components/laporan/BukuSakitSection";
import FinancialSummaryCards from "@/components/laporan/FinancialSummaryCards";
import FinancialTrend from "@/components/laporan/FinancialTrend";
import BudgetRealization from "@/components/laporan/BudgetRealization";
import FinancialTransactionTable from "@/components/laporan/FinancialTransactionTable";

import { getDefaultPeriodParams, resolvePeriod, serializePeriodParams, PeriodParams } from "@/lib/reportPeriod";
import {
  fetchOperationalSummary,
  fetchAvailabilityTrend,
  fetchCorrectiveMaintenanceReport,
  fetchPreventiveMaintenanceReport,
  fetchBukuSakitReport,
  OperationalSummary,
  AvailabilityTrendPoint,
  CorrectiveMaintenanceReport,
  PreventiveMaintenanceReport,
  BukuSakitReport,
} from "@/lib/reportQueries";
import { fetchFinancialReport, FinancialReport } from "@/lib/reportFinance";

export default function ReportPage() {
  const [periodParams, setPeriodParams] = useState<PeriodParams>(getDefaultPeriodParams());
  const period = useMemo(() => resolvePeriod(periodParams), [periodParams]);

  const previewHref = useMemo(() => {
    const qs = new URLSearchParams(serializePeriodParams(periodParams));
    return `/laporan/preview?${qs.toString()}`;
  }, [periodParams]);

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [trend, setTrend] = useState<AvailabilityTrendPoint[]>([]);
  const [corrective, setCorrective] = useState<CorrectiveMaintenanceReport | null>(null);
  const [preventive, setPreventive] = useState<PreventiveMaintenanceReport | null>(null);
  const [bukuSakit, setBukuSakit] = useState<BukuSakitReport | null>(null);
  const [financial, setFinancial] = useState<FinancialReport | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    Promise.all([
      fetchOperationalSummary(period),
      fetchAvailabilityTrend(period),
      fetchCorrectiveMaintenanceReport(period),
      fetchPreventiveMaintenanceReport(period),
      fetchBukuSakitReport(period),
      fetchFinancialReport(period),
    ]).then(([summaryData, trendData, correctiveData, preventiveData, bukuSakitData, financialData]) => {
      if (isCancelled) return;
      setSummary(summaryData);
      setTrend(trendData);
      setCorrective(correctiveData);
      setPreventive(preventiveData);
      setBukuSakit(bukuSakitData);
      setFinancial(financialData);
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.startDate, period.endDate]);

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Laporan</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm">
          Laporan operasional dan keuangan/manajemen berdasarkan data aset dan pemeliharaan secara real-time
        </p>
      </div>

      {/* PANEL FILTER */}
      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Filter Periode (reusable, sama pola dengan AvailabilityChart) */}
          <PeriodFilter value={periodParams} onChange={setPeriodParams} />

          <Link
            href={previewHref}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors w-fit shrink-0"
          >
            <Eye size={16} /> Preview & Cetak Laporan
          </Link>
        </div>

        <p className="text-2xl font-bold text-[#0D9488]">{period.label}</p>
      </div>

      {/* KONTEN LAPORAN (OPERASIONAL + KEUANGAN/MANAJEMEN DALAM SATU HALAMAN) */}
      <div className="flex flex-col gap-10">
        <SummaryCards data={summary} isLoading={isLoading} />
        <AvailabilityTrend data={trend} isLoading={isLoading} />
        <CorrectiveSection data={corrective} isLoading={isLoading} />
        <PreventiveSection data={preventive} isLoading={isLoading} />
        <BukuSakitSection data={bukuSakit} isLoading={isLoading} />

        <FinancialSummaryCards data={financial} isLoading={isLoading} />
        <FinancialTrend data={financial} isLoading={isLoading} />
        <BudgetRealization data={financial} isLoading={isLoading} />
        <FinancialTransactionTable data={financial} isLoading={isLoading} />
      </div>
    </div>
  );
}