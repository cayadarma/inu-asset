"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import PeriodFilter from "@/components/laporan/PeriodFilter";
import SummaryCards from "@/components/laporan/SummaryCards";
import AvailabilityTrend from "@/components/laporan/AvailabilityTrend";
import CorrectiveSection from "@/components/laporan/CorrectiveSection";
import PreventiveSection from "@/components/laporan/PreventiveSection";
import BukuSakitSection from "@/components/laporan/BukuSakitSection";

import { getDefaultPeriodParams, resolvePeriod, PeriodParams } from "@/lib/reportPeriod";
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

type ReportType = "Operasional" | "Keuangan";

export default function ReportPage() {
  const [reportType, setReportType] = useState<ReportType>("Operasional");
  const [periodParams, setPeriodParams] = useState<PeriodParams>(getDefaultPeriodParams());
  const period = useMemo(() => resolvePeriod(periodParams), [periodParams]);

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [trend, setTrend] = useState<AvailabilityTrendPoint[]>([]);
  const [corrective, setCorrective] = useState<CorrectiveMaintenanceReport | null>(null);
  const [preventive, setPreventive] = useState<PreventiveMaintenanceReport | null>(null);
  const [bukuSakit, setBukuSakit] = useState<BukuSakitReport | null>(null);

  useEffect(() => {
    if (reportType !== "Operasional") return;

    let isCancelled = false;
    setIsLoading(true);

    Promise.all([
      fetchOperationalSummary(period),
      fetchAvailabilityTrend(period),
      fetchCorrectiveMaintenanceReport(period),
      fetchPreventiveMaintenanceReport(period),
      fetchBukuSakitReport(period),
    ]).then(([summaryData, trendData, correctiveData, preventiveData, bukuSakitData]) => {
      if (isCancelled) return;
      setSummary(summaryData);
      setTrend(trendData);
      setCorrective(correctiveData);
      setPreventive(preventiveData);
      setBukuSakit(bukuSakitData);
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, period.startDate, period.endDate]);

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
          {/* Jenis Laporan */}
          <div className="relative w-full lg:w-auto">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full lg:w-auto appearance-none px-4 py-2.5 pr-10 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm text-[#0F172A] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer font-bold"
            >
              <option value="Operasional">Laporan Operasional</option>
              <option value="Keuangan">Laporan Keuangan / Manajemen</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>

          {/* Filter Periode (reusable, sama pola dengan AvailabilityChart) */}
          <PeriodFilter value={periodParams} onChange={setPeriodParams} />
        </div>

        <p className="text-xs font-bold text-[#0D9488]">{period.label}</p>
      </div>

      {/* KONTEN LAPORAN */}
      {reportType === "Operasional" ? (
        <div className="flex flex-col gap-10">
          <SummaryCards data={summary} isLoading={isLoading} />
          <AvailabilityTrend data={trend} isLoading={isLoading} />
          <CorrectiveSection data={corrective} isLoading={isLoading} />
          <PreventiveSection data={preventive} isLoading={isLoading} />
          <BukuSakitSection data={bukuSakit} isLoading={isLoading} />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E293B] p-10 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm text-center text-[#94A3B8] italic">
          Laporan Keuangan / Manajemen menyusul di tahap berikutnya (reuse logic dari halaman Analisis Biaya).
        </div>
      )}
    </div>
  );
}