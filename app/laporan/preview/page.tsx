"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Download, FileSpreadsheet, Printer } from "lucide-react";
import Link from "next/link";

import { parsePeriodParams, resolvePeriod } from "@/lib/reportPeriod";
import {
  fetchOperationalSummary,
  fetchCorrectiveMaintenanceReport,
  fetchPreventiveMaintenanceReport,
  fetchBukuSakitReport,
  OperationalSummary,
  CorrectiveMaintenanceReport,
  PreventiveMaintenanceReport,
  BukuSakitReport,
} from "@/lib/reportQueries";
import { fetchFinancialReport, FinancialReport } from "@/lib/reportFinance";
import { REPORT_SECTIONS, ReportSectionSelection, defaultReportSectionSelection } from "@/lib/reportSections";
import ReportTemplate, { A4_WIDTH_MM } from "@/components/laporan/ReportTemplate";
// TODO (Langkah 6 - Step 6.2 & 6.3): reportExport.ts akan diperbarui untuk
// merender ReportTemplate yang sama (html2canvas + jsPDF) & exceljs dg foto WO.
// Untuk saat ini export masih placeholder supaya halaman tidak rusak di tengah migrasi.
import { exportReportPDF, exportReportExcel } from "@/lib/reportExport";

function ReportPreviewContent() {
  const searchParams = useSearchParams();
  const periodParams = useMemo(() => parsePeriodParams(searchParams), [searchParams]);
  const period = useMemo(() => resolvePeriod(periodParams), [periodParams]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<"pdf" | "excel" | null>(null);

  // Panel checklist section — DEFAULT SEMUA TERCENTANG saat pertama dibuka (poin 3, Langkah 6).
  const [sections, setSections] = useState<ReportSectionSelection>(defaultReportSectionSelection());
  const toggleSection = (key: keyof ReportSectionSelection) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // --- Data gabungan: Operasional + Keuangan sekaligus (preview sekarang 1 halaman, bukan per-tipe) ---
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [corrective, setCorrective] = useState<CorrectiveMaintenanceReport | null>(null);
  const [preventive, setPreventive] = useState<PreventiveMaintenanceReport | null>(null);
  const [bukuSakit, setBukuSakit] = useState<BukuSakitReport | null>(null);
  const [financial, setFinancial] = useState<FinancialReport | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    Promise.all([
      fetchOperationalSummary(period),
      fetchCorrectiveMaintenanceReport(period),
      fetchPreventiveMaintenanceReport(period),
      fetchBukuSakitReport(period),
      fetchFinancialReport(period),
    ]).then(([summaryData, correctiveData, preventiveData, bukuSakitData, financialData]) => {
      if (isCancelled) return;
      setSummary(summaryData);
      setCorrective(correctiveData);
      setPreventive(preventiveData);
      setBukuSakit(bukuSakitData);
      setFinancial(financialData);
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [period.startDate, period.endDate]);

  const templateData = { period, sections, summary, corrective, preventive, bukuSakit, financial };

  const handleExportPDF = async () => {
    if (isLoading || isExporting) return;
    setIsExporting("pdf");
    try {
      await exportReportPDF(templateData);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (isLoading || isExporting) return;
    setIsExporting("excel");
    try {
      await exportReportExcel(templateData);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1200px] mx-auto">
      {/* Panel kiri: Action bar + Checklist section (tidak ikut tercetak) */}
      <div className="print:hidden flex flex-col gap-4 lg:w-[260px] flex-shrink-0">
        <Link href="/laporan" className="flex items-center gap-2 text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:text-dark">
          <ChevronLeft size={20} /> Kembali
        </Link>

        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-[#334155] flex flex-col gap-3">
          <p className="text-xs font-black uppercase tracking-wider text-secondary dark:text-[#94A3B8]">Pilih Section</p>
          {REPORT_SECTIONS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm text-dark dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={sections[s.key]}
                onChange={() => toggleSection(s.key)}
                className="w-4 h-4 accent-[#0D9488] rounded"
              />
              {s.label}
            </label>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-[#334155] flex flex-col gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50"
          >
            <Printer size={18} /> Cetak
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isLoading || isExporting !== null}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={18} /> {isExporting === "excel" ? "Menyiapkan..." : "Download Excel"}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isLoading || isExporting !== null}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} /> {isExporting === "pdf" ? "Menyiapkan..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* KERTAS LAPORAN A4 (live preview) */}
      <div className="flex-1 flex justify-center overflow-x-auto">
        {isLoading ? (
          <p className="text-center text-muted-text italic py-20">Memuat data laporan...</p>
        ) : (
          <div
            className="shadow-xl print:shadow-none"
            style={{ width: `${A4_WIDTH_MM}mm`, transformOrigin: "top center" }}
          >
            <ReportTemplate data={templateData} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportPreviewPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted-text italic py-20">Memuat...</p>}>
      <ReportPreviewContent />
    </Suspense>
  );
}