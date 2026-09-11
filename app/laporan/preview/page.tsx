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
  formatDurationHours,
  OperationalSummary,
  CorrectiveMaintenanceReport,
  PreventiveMaintenanceReport,
  BukuSakitReport,
} from "@/lib/reportQueries";
import { fetchFinancialReport, FinancialReport } from "@/lib/reportFinance";
import {
  exportOperationalPDF,
  exportFinancialPDF,
  exportOperationalExcel,
  exportFinancialExcel,
} from "@/lib/reportExport";

const formatRupiah = (n: number | null | undefined) => `Rp ${(n || 0).toLocaleString("id-ID")}`;
const formatTanggalSingkat = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

function ReportPreviewContent() {
  const searchParams = useSearchParams();
  const reportType = searchParams.get("type") === "Keuangan" ? "Keuangan" : "Operasional";
  const periodParams = useMemo(() => parsePeriodParams(searchParams), [searchParams]);
  const period = useMemo(() => resolvePeriod(periodParams), [periodParams]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<"pdf" | "excel" | null>(null);

  // --- Data Operasional ---
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [corrective, setCorrective] = useState<CorrectiveMaintenanceReport | null>(null);
  const [preventive, setPreventive] = useState<PreventiveMaintenanceReport | null>(null);
  const [bukuSakit, setBukuSakit] = useState<BukuSakitReport | null>(null);

  // --- Data Keuangan ---
  const [financial, setFinancial] = useState<FinancialReport | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    if (reportType === "Operasional") {
      Promise.all([
        fetchOperationalSummary(period),
        fetchCorrectiveMaintenanceReport(period),
        fetchPreventiveMaintenanceReport(period),
        fetchBukuSakitReport(period),
      ]).then(([summaryData, correctiveData, preventiveData, bukuSakitData]) => {
        if (isCancelled) return;
        setSummary(summaryData);
        setCorrective(correctiveData);
        setPreventive(preventiveData);
        setBukuSakit(bukuSakitData);
        setIsLoading(false);
      });
    } else {
      fetchFinancialReport(period).then((financialData) => {
        if (isCancelled) return;
        setFinancial(financialData);
        setIsLoading(false);
      });
    }

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, period.startDate, period.endDate]);

  const handleExportPDF = async () => {
    if (isLoading || isExporting) return;
    setIsExporting("pdf");
    try {
      if (reportType === "Operasional") {
        await exportOperationalPDF(period, { summary, corrective, preventive, bukuSakit });
      } else if (financial) {
        await exportFinancialPDF(period, financial);
      }
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (isLoading || isExporting) return;
    setIsExporting("excel");
    try {
      if (reportType === "Operasional") {
        await exportOperationalExcel(period, { summary, corrective, preventive, bukuSakit });
      } else if (financial) {
        await exportFinancialExcel(period, financial);
      }
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto">
      {/* Action Bar (tidak ikut tercetak) */}
      <div className="print:hidden flex justify-between items-center bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-[#334155]">
        <Link href="/laporan" className="flex items-center gap-2 text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:text-dark">
          <ChevronLeft size={20} /> Kembali
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50"
          >
            <Printer size={18} /> Cetak
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isLoading || isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={18} /> {isExporting === "excel" ? "Menyiapkan..." : "Download Excel"}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isLoading || isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} /> {isExporting === "pdf" ? "Menyiapkan..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* KERTAS LAPORAN */}
      <div className="bg-white dark:bg-[#1E293B] p-12 md:p-16 shadow-xl border border-gray-200 dark:border-[#334155] rounded-sm min-h-[1000px] flex flex-col gap-10 print:shadow-none print:border-0">
        {/* Kop Surat */}
        <div className="flex justify-between items-start border-b-2 border-dark pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-black text-2xl">I</div>
            <div>
              <h2 className="text-xl font-black text-dark tracking-tighter">INU Asset</h2>
              <p className="text-xs text-muted-text">PT. ITDC Nusantara Utilitas</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-secondary">DOKUMEN INTERNAL</p>
            <p className="text-[10px] text-muted-text">Dicetak: {formatTanggalSingkat(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Judul Laporan */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold text-dark uppercase underline">
            {reportType === "Operasional" ? "Laporan Operasional" : "Laporan Keuangan / Manajemen"}
          </h1>
          <p className="text-sm text-secondary font-medium uppercase">Seluruh Lokasi — {period.label}</p>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-text italic py-20">Memuat data laporan...</p>
        ) : reportType === "Operasional" ? (
          <OperationalPreviewBody summary={summary} corrective={corrective} preventive={preventive} bukuSakit={bukuSakit} />
        ) : (
          <FinancialPreviewBody data={financial} />
        )}

        {/* Tanda Tangan */}
        <div className="flex justify-between items-end pt-10">
          <div className="flex flex-col gap-20">
            <p className="text-xs font-bold">Disiapkan Oleh:</p>
            <div className="border-t border-dark pt-2">
              <p className="text-xs font-bold text-dark">&nbsp;</p>
              <p className="text-[10px] text-muted-text italic">Supervisor Pemeliharaan</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-20">
            <p className="text-xs font-bold">Disetujui Oleh:</p>
            <div className="border-t border-dark pt-2 text-right">
              <p className="text-xs font-bold text-dark">&nbsp;</p>
              <p className="text-[10px] text-muted-text italic">General Manager</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BODY: LAPORAN OPERASIONAL
// ============================================================
function OperationalPreviewBody({
  summary,
  corrective,
  preventive,
  bukuSakit,
}: {
  summary: OperationalSummary | null;
  corrective: CorrectiveMaintenanceReport | null;
  preventive: PreventiveMaintenanceReport | null;
  bukuSakit: BukuSakitReport | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* Kotak Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryBox
          label="Availability"
          value={summary?.availabilityAvgPct !== null && summary?.availabilityAvgPct !== undefined ? `${summary.availabilityAvgPct.toFixed(1)}%` : "-"}
        />
        <SummaryBox label="WO Selesai" value={`${summary?.totalWorkOrderSelesai ?? 0} / ${summary?.totalWorkOrder ?? 0}`} />
        <SummaryBox label="MTTR" value={formatDurationHours(summary?.mttrHours ?? null)} color="text-[#F59E0B]" />
        <SummaryBox label="PM Completion" value={`${(summary?.pmCompletionRatePct ?? 0).toFixed(0)}%`} color="text-[#10B981]" />
      </div>

      {/* Tabel Corrective Maintenance */}
      <PreviewSection title="Corrective Maintenance (Work Order)">
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">ID WO</th>
              <th className="border border-gray-300 p-2">Aset / Lokasi</th>
              <th className="border border-gray-300 p-2">Kejadian</th>
              <th className="border border-gray-300 p-2">Status</th>
              <th className="border border-gray-300 p-2">Biaya</th>
            </tr>
          </thead>
          <tbody>
            {!corrective || corrective.detailRows.length === 0 ? (
              <EmptyRow colSpan={5} />
            ) : (
              corrective.detailRows.map((wo) => (
                <tr key={wo.id}>
                  <td className="border border-gray-300 p-2 font-bold">{wo.id}</td>
                  <td className="border border-gray-300 p-2">{wo.assetName} — {wo.locationName}</td>
                  <td className="border border-gray-300 p-2 italic">{wo.trouble || "-"}</td>
                  <td className="border border-gray-300 p-2 text-center">{wo.status}</td>
                  <td className="border border-gray-300 p-2 text-right">{formatRupiah(wo.actualCost)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PreviewSection>

      {/* Tabel Preventive Maintenance */}
      <PreviewSection title="Preventive Maintenance (Checklist)">
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Tanggal</th>
              <th className="border border-gray-300 p-2">Aset / Lokasi</th>
              <th className="border border-gray-300 p-2">Operator</th>
              <th className="border border-gray-300 p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {!preventive || preventive.detailRows.length === 0 ? (
              <EmptyRow colSpan={4} />
            ) : (
              preventive.detailRows.map((s) => (
                <tr key={s.id}>
                  <td className="border border-gray-300 p-2">{formatTanggalSingkat(s.scheduledDate)}</td>
                  <td className="border border-gray-300 p-2">{s.assetName} — {s.locationName}</td>
                  <td className="border border-gray-300 p-2">{s.operatorName || "-"}</td>
                  <td className="border border-gray-300 p-2 text-center">{s.displayStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PreviewSection>

      {/* Tabel Buku Sakit */}
      <PreviewSection title="Buku Sakit (Laporan Kerusakan)">
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Tanggal</th>
              <th className="border border-gray-300 p-2">Aset / Lokasi</th>
              <th className="border border-gray-300 p-2">Kejadian</th>
              <th className="border border-gray-300 p-2">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {!bukuSakit || bukuSakit.detailRows.length === 0 ? (
              <EmptyRow colSpan={4} />
            ) : (
              bukuSakit.detailRows.map((r) => (
                <tr key={r.id}>
                  <td className="border border-gray-300 p-2">{formatTanggalSingkat(r.createdAt)}</td>
                  <td className="border border-gray-300 p-2">{r.assetName} — {r.locationName}</td>
                  <td className="border border-gray-300 p-2 italic">{r.issueTitle || "-"}</td>
                  <td className="border border-gray-300 p-2 text-center">{r.urgency || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PreviewSection>
    </div>
  );
}

// ============================================================
// BODY: LAPORAN KEUANGAN / MANAJEMEN
// ============================================================
function FinancialPreviewBody({ data }: { data: FinancialReport | null }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Kotak Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <SummaryBox label="Total Biaya" value={formatRupiah(data?.totalKeseluruhan)} />
        <SummaryBox label="Total Anggaran" value={formatRupiah(data?.budgetTotal)} />
        <SummaryBox
          label="Anggaran Terpakai"
          value={data && data.budgetTotal > 0 ? `${data.realisasiPct}%` : "-"}
          color={data && data.realisasiPct >= 100 ? "text-[#EF4444]" : "text-[#10B981]"}
        />
      </div>

      {/* Ringkasan per kategori */}
      <PreviewSection title="Ringkasan per Kategori Biaya">
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Kategori</th>
              <th className="border border-gray-300 p-2 text-right">Jumlah Biaya</th>
              <th className="border border-gray-300 p-2 text-right">% dari Total</th>
            </tr>
          </thead>
          <tbody>
            {(["Pemeliharaan", "Perbaikan", "Pembelian Stok", "Pembelian Aset"] as const).map((cat) => {
              const total = data?.totalsByCategory[cat] ?? 0;
              const pct = data && data.totalKeseluruhan > 0 ? Math.round((total / data.totalKeseluruhan) * 100) : 0;
              return (
                <tr key={cat}>
                  <td className="border border-gray-300 p-2 font-bold">{cat}</td>
                  <td className="border border-gray-300 p-2 text-right">{formatRupiah(total)}</td>
                  <td className="border border-gray-300 p-2 text-right">{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PreviewSection>

      {/* Tabel Detail Transaksi */}
      <PreviewSection title="Rincian Transaksi Biaya">
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2">Tanggal</th>
              <th className="border border-gray-300 p-2">Kategori</th>
              <th className="border border-gray-300 p-2">Deskripsi</th>
              <th className="border border-gray-300 p-2">Lokasi</th>
              <th className="border border-gray-300 p-2 text-right">Biaya</th>
            </tr>
          </thead>
          <tbody>
            {!data || data.detailRows.length === 0 ? (
              <EmptyRow colSpan={5} />
            ) : (
              data.detailRows.map((tx) => (
                <tr key={tx.id}>
                  <td className="border border-gray-300 p-2">{formatTanggalSingkat(tx.date)}</td>
                  <td className="border border-gray-300 p-2">{tx.category}</td>
                  <td className="border border-gray-300 p-2">{tx.description}</td>
                  <td className="border border-gray-300 p-2">{tx.location || "-"}</td>
                  <td className="border border-gray-300 p-2 text-right">{formatRupiah(tx.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PreviewSection>
    </div>
  );
}

// ============================================================
// HELPER PRESENTASIONAL
// ============================================================
function SummaryBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 dark:border-[#334155] flex flex-col items-center">
      <span className="text-[10px] text-secondary font-bold uppercase mb-1">{label}</span>
      <span className={`text-xl font-black text-dark ${color || ""}`}>{value}</span>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 break-inside-avoid">
      <h3 className="text-xs font-black uppercase tracking-wider text-dark border-b border-gray-200 pb-1">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="border border-gray-300 p-4 text-center italic text-muted-text">
        Belum ada data pada periode ini.
      </td>
    </tr>
  );
}

export default function ReportPreviewPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted-text italic py-20">Memuat...</p>}>
      <ReportPreviewContent />
    </Suspense>
  );
}