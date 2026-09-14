// components/laporan/ReportTemplate.tsx
//
// SINGLE SOURCE OF TRUTH untuk tampilan kertas laporan (Langkah 6).
// Dipakai oleh:
// 1. app/laporan/preview/page.tsx  -> live preview di browser (1 dokumen scroll,
//    lewat komponen default `ReportTemplate`)
// 2. lib/reportPaginator.tsx       -> proses export PDF, memakai potongan2 kecil
//    yang diekspor file ini (ReportHeader, ReportPageFrame, getSectionMeta, dst)
//    untuk disusun ulang jadi beberapa halaman A4 terpisah, MASING-MASING dengan
//    header sendiri (lihat lib/reportPaginator.tsx untuk penjelasan lengkap).
//
// Karena dipakai utk PDF juga, style di sini SENGAJA pakai warna solid (bukan
// class Tailwind dark:) dan ukuran fixed dalam mm/px supaya hasil identik di
// kedua tempat, dan konsisten dg standar kertas A4 (210mm x 297mm).

import React from "react";
import { ResolvedPeriod } from "@/lib/reportPeriod";
import {
  OperationalSummary,
  CorrectiveMaintenanceReport,
  PreventiveMaintenanceReport,
  BukuSakitReport,
} from "@/lib/reportQueries";
import { FinancialReport } from "@/lib/reportFinance";
import { COST_CATEGORIES } from "@/lib/costQueries";
import { ReportSectionKey, ReportSectionSelection } from "@/lib/reportSections";

// Logo perusahaan — taruh file di public/Logo_INU_UPDATE_2024.png
const ITDC_LOGO_SRC = "/Logo_INU_UPDATE_2024.png";

export const formatRupiah = (n: number | null | undefined) => `Rp ${(n || 0).toLocaleString("id-ID")}`;
export const formatTanggalSingkat = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

export interface ReportTemplateData {
  period: ResolvedPeriod;
  sections: ReportSectionSelection;
  summary: OperationalSummary | null;
  corrective: CorrectiveMaintenanceReport | null;
  preventive: PreventiveMaintenanceReport | null;
  bukuSakit: BukuSakitReport | null;
  financial: FinancialReport | null;
}

// Ukuran kertas A4 standar dg margin konsisten preview <-> PDF.
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_MARGIN_MM = 15;

// id DOM kertas yg dipakai halaman preview (dokumen 1x scroll panjang).
export const REPORT_TEMPLATE_DOM_ID = "report-template-a4";
// prefix id DOM per-halaman yg dipakai proses export PDF (lihat reportPaginator.tsx)
export const REPORT_PDF_PAGE_ID_PREFIX = "report-pdf-page-";

// ============================================================
// KOP SURAT — dipakai berulang di SETIAP halaman PDF, dan sekali di preview.
// ============================================================
export function ReportHeader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ITDC_LOGO_SRC} alt="ITDC Utilitas" style={{ height: 34, width: "auto" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>INU Asset</span>
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>PT ITDC Nusantara Utilitas</span>
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11 }}>Dicetak: {formatTanggalSingkat(new Date().toISOString())}</span>
      </div>
      <div style={{ borderTop: "1.5pt solid #000000" }} />
    </div>
  );
}

// ============================================================
// BUNGKUS KERTAS A4 — dipakai baik utk preview (continuous, minHeight, boleh
// tumbuh ke bawah) maupun export PDF per-halaman (fixedHeight, overflow hidden,
// supaya screenshot-nya pas persis 1 halaman A4).
// ============================================================
export function ReportPageFrame({
  id,
  fixedHeight,
  footer,
  children,
}: {
  id: string;
  fixedHeight?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        width: `${A4_WIDTH_MM}mm`,
        height: fixedHeight ? `${A4_HEIGHT_MM}mm` : undefined,
        minHeight: fixedHeight ? undefined : `${A4_HEIGHT_MM}mm`,
        overflow: fixedHeight ? "hidden" : undefined,
        padding: `${A4_MARGIN_MM}mm`,
        background: "#FFFFFF",
        color: "#0F172A",
        boxSizing: "border-box",
        fontFamily: "Poppins, Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        position: "relative",
      }}
      className="report-a4-page"
    >
      <ReportHeader />
      {children}
      {footer}
    </div>
  );
}

export function ReportPageNumber({ page, totalPages }: { page: number; totalPages: number }) {
  return (
    <div style={{ position: "absolute", bottom: `${A4_MARGIN_MM}mm`, right: `${A4_MARGIN_MM}mm`, fontSize: 8, color: "#94A3B8" }}>
      Halaman {page} dari {totalPages}
    </div>
  );
}

export function ReportTitle({ period }: { period: ResolvedPeriod }) {
  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
      <h1 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", textDecoration: "underline", margin: 0 }}>
        Laporan Operasional &amp; Keuangan
      </h1>
      <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>
        Seluruh Lokasi — {period.label}
      </p>
    </div>
  );
}

export function ReportSignature() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 60 }}>
        <p style={{ fontSize: 10, fontWeight: 700, margin: 0 }}>Disiapkan Oleh:</p>
        <div style={{ borderTop: "1px solid #0F172A", paddingTop: 4, width: 160 }}>
          <p style={{ fontSize: 8, color: "#94A3B8", fontStyle: "italic", margin: 0 }}>Supervisor Pemeliharaan</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 60 }}>
        <p style={{ fontSize: 10, fontWeight: 700, margin: 0 }}>Disetujui Oleh:</p>
        <div style={{ borderTop: "1px solid #0F172A", paddingTop: 4, width: 160, textAlign: "right" }}>
          <p style={{ fontSize: 8, color: "#94A3B8", fontStyle: "italic", margin: 0 }}>General Manager</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STYLE HELPERS (inline style dipakai supaya identik saat di-capture html2canvas)
// table-layout FIXED + lebar kolom eksplisit (lihat COLUMN_WIDTHS) supaya lebar
// kolom SAMA PERSIS antara tabel utuh (preview) & tabel per-halaman yg dipotong
// ulang oleh paginator (perlu ini karena tiap halaman = <table> baru).
// ============================================================
export const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 9, tableLayout: "fixed" };
export const theadRowStyle: React.CSSProperties = { background: "#F1F5F9" };
export const thStyle: React.CSSProperties = { border: "1px solid #CBD5E1", padding: 6, textAlign: "left", overflow: "hidden" };
export const tdStyle: React.CSSProperties = { border: "1px solid #CBD5E1", padding: 6, overflow: "hidden", wordBreak: "break-word" };
export const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: "center" };
export const tdRightStyle: React.CSSProperties = { ...tdStyle, textAlign: "right" };

export function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", paddingBottom: 4, margin: 0 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: 10, background: "#F8FAFC", borderRadius: 8, border: "1px solid #F1F5F9", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: 8, color: "#475569", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900 }}>{value}</span>
    </div>
  );
}

export function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ ...tdStyle, textAlign: "center", fontStyle: "italic", color: "#94A3B8", padding: 16 }}>
        Belum ada data pada periode ini.
      </td>
    </tr>
  );
}

// ============================================================
// META PER SECTION — dipakai bareng oleh preview (render semua row langsung)
// dan paginator (ambil thead + rows satu-satu untuk dipaketkan ke halaman2).
// ============================================================
export const COLUMN_WIDTHS: Record<Exclude<ReportSectionKey, "ringkasan">, string[]> = {
  corrective: ["12%", "30%", "28%", "12%", "18%"],
  preventive: ["18%", "32%", "25%", "25%"],
  bukusakit: ["18%", "32%", "30%", "20%"],
  keuangan: ["40%", "35%", "25%"],
};

function ColGroup({ widths }: { widths: string[] }) {
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

export interface SectionTableMeta {
  title: string;
  colWidths: string[];
  thead: React.ReactNode;
  rows: { id: string; content: React.ReactNode }[];
  colSpan: number;
}

export function getSectionTableMeta(key: Exclude<ReportSectionKey, "ringkasan">, data: ReportTemplateData): SectionTableMeta {
  if (key === "corrective") {
    const rows = data.corrective?.detailRows ?? [];
    return {
      title: "Corrective Maintenance (Work Order)",
      colWidths: COLUMN_WIDTHS.corrective,
      colSpan: 5,
      thead: (
        <tr style={theadRowStyle}>
          <th style={thStyle}>ID WO</th>
          <th style={thStyle}>Aset / Lokasi</th>
          <th style={thStyle}>Kejadian</th>
          <th style={thStyle}>Status</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Biaya</th>
        </tr>
      ),
      rows: rows.map((wo) => ({
        id: String(wo.id),
        content: (
          <tr key={wo.id}>
            <td style={tdStyle}>{wo.id}</td>
            <td style={tdStyle}>{wo.assetName} — {wo.locationName}</td>
            <td style={{ ...tdStyle, fontStyle: "italic" }}>{wo.trouble || "-"}</td>
            <td style={tdCenterStyle}>{wo.status}</td>
            <td style={tdRightStyle}>{formatRupiah(wo.actualCost)}</td>
          </tr>
        ),
      })),
    };
  }

  if (key === "preventive") {
    const rows = data.preventive?.detailRows ?? [];
    return {
      title: "Preventive Maintenance (Checklist)",
      colWidths: COLUMN_WIDTHS.preventive,
      colSpan: 4,
      thead: (
        <tr style={theadRowStyle}>
          <th style={thStyle}>Tanggal</th>
          <th style={thStyle}>Aset / Lokasi</th>
          <th style={thStyle}>Operator</th>
          <th style={thStyle}>Status</th>
        </tr>
      ),
      rows: rows.map((s) => ({
        id: String(s.id),
        content: (
          <tr key={s.id}>
            <td style={tdStyle}>{formatTanggalSingkat(s.scheduledDate)}</td>
            <td style={tdStyle}>{s.assetName} — {s.locationName}</td>
            <td style={tdStyle}>{s.operatorName || "-"}</td>
            <td style={tdCenterStyle}>{s.displayStatus}</td>
          </tr>
        ),
      })),
    };
  }

  if (key === "bukusakit") {
    const rows = data.bukuSakit?.detailRows ?? [];
    return {
      title: "Buku Sakit (Laporan Kerusakan)",
      colWidths: COLUMN_WIDTHS.bukusakit,
      colSpan: 4,
      thead: (
        <tr style={theadRowStyle}>
          <th style={thStyle}>Tanggal</th>
          <th style={thStyle}>Aset / Lokasi</th>
          <th style={thStyle}>Kejadian</th>
          <th style={thStyle}>Urgency</th>
        </tr>
      ),
      rows: rows.map((r) => ({
        id: String(r.id),
        content: (
          <tr key={r.id}>
            <td style={tdStyle}>{formatTanggalSingkat(r.createdAt)}</td>
            <td style={tdStyle}>{r.assetName} — {r.locationName}</td>
            <td style={{ ...tdStyle, fontStyle: "italic" }}>{r.issueTitle || "-"}</td>
            <td style={tdCenterStyle}>{r.urgency || "-"}</td>
          </tr>
        ),
      })),
    };
  }

  // keuangan
  const financial = data.financial;
  return {
    title: "Ringkasan Keuangan",
    colWidths: COLUMN_WIDTHS.keuangan,
    colSpan: 3,
    thead: (
      <tr style={theadRowStyle}>
        <th style={thStyle}>Kategori</th>
        <th style={{ ...thStyle, textAlign: "right" }}>Jumlah Biaya</th>
        <th style={{ ...thStyle, textAlign: "right" }}>% dari Total</th>
      </tr>
    ),
    rows: COST_CATEGORIES.map((cat) => {
      const total = financial?.totalsByCategory[cat] ?? 0;
      const pct = financial && financial.totalKeseluruhan > 0 ? Math.round((total / financial.totalKeseluruhan) * 100) : 0;
      return {
        id: cat,
        content: (
          <tr key={cat}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>{cat}</td>
            <td style={tdRightStyle}>{formatRupiah(total)}</td>
            <td style={tdRightStyle}>{pct}%</td>
          </tr>
        ),
      };
    }),
  };
}

// Render tabel utuh (semua rows sekaligus) — dipakai preview & sbg 1 "chunk" oleh paginator.
export function FullSectionTable({ meta }: { meta: SectionTableMeta }) {
  return (
    <table style={tableStyle}>
      <ColGroup widths={meta.colWidths} />
      <thead>{meta.thead}</thead>
      <tbody>{meta.rows.length === 0 ? <EmptyRow colSpan={meta.colSpan} /> : meta.rows.map((r) => r.content)}</tbody>
    </table>
  );
}

export function KeuanganSummaryBoxes({ financial }: { financial: FinancialReport | null }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <SummaryBox label="Total Biaya" value={formatRupiah(financial?.totalKeseluruhan)} />
      <SummaryBox label="Total Anggaran" value={formatRupiah(financial?.budgetTotal)} />
      <SummaryBox label="Anggaran Terpakai" value={financial && financial.budgetTotal > 0 ? `${financial.realisasiPct}%` : "-"} />
    </div>
  );
}

export function RingkasanOperasionalTable({ summary }: { summary: OperationalSummary | null }) {
  return (
    <table style={tableStyle}>
      <colgroup>
        <col style={{ width: "25%" }} />
        <col style={{ width: "25%" }} />
        <col style={{ width: "25%" }} />
        <col style={{ width: "25%" }} />
      </colgroup>
      <thead>
        <tr style={theadRowStyle}>
          <th style={thStyle}>Availability</th>
          <th style={thStyle}>WO Selesai</th>
          <th style={thStyle}>MTTR</th>
          <th style={thStyle}>PM Completion</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={tdCenterStyle}>
            {summary?.availabilityAvgPct !== null && summary?.availabilityAvgPct !== undefined ? `${summary.availabilityAvgPct.toFixed(1)}%` : "-"}
          </td>
          <td style={tdCenterStyle}>{summary?.totalWorkOrderSelesai ?? 0} / {summary?.totalWorkOrder ?? 0}</td>
          <td style={tdCenterStyle}>
            {summary?.mttrHours !== null && summary?.mttrHours !== undefined ? `${summary.mttrHours.toFixed(1)} jam` : "-"}
          </td>
          <td style={tdCenterStyle}>{(summary?.pmCompletionRatePct ?? 0).toFixed(0)}%</td>
        </tr>
      </tbody>
    </table>
  );
}

// ============================================================
// PREVIEW — dokumen 1x scroll panjang (TIDAK dipaginasi; itu cuma perlu utk
// hasil unduhan PDF, lihat lib/reportPaginator.tsx). Sesuai kesepakatan awal,
// preview browser boleh scroll terus, yang penting hasil PDF-nya benar.
// ============================================================
export default function ReportTemplate({ data }: { data: ReportTemplateData }) {
  const { period, sections, summary, corrective, preventive, bukuSakit, financial } = data;

  return (
    <ReportPageFrame id={REPORT_TEMPLATE_DOM_ID}>
      <ReportTitle period={period} />

      {sections.ringkasan && (
        <SectionBox title="Ringkasan Operasional">
          <RingkasanOperasionalTable summary={summary} />
        </SectionBox>
      )}

      {sections.corrective && (
        <SectionBox title={getSectionTableMeta("corrective", data).title}>
          <FullSectionTable meta={getSectionTableMeta("corrective", data)} />
        </SectionBox>
      )}

      {sections.preventive && (
        <SectionBox title={getSectionTableMeta("preventive", data).title}>
          <FullSectionTable meta={getSectionTableMeta("preventive", data)} />
        </SectionBox>
      )}

      {sections.bukusakit && (
        <SectionBox title={getSectionTableMeta("bukusakit", data).title}>
          <FullSectionTable meta={getSectionTableMeta("bukusakit", data)} />
        </SectionBox>
      )}

      {sections.keuangan && (
        <SectionBox title="Ringkasan Keuangan">
          <KeuanganSummaryBoxes financial={financial} />
          <FullSectionTable meta={getSectionTableMeta("keuangan", data)} />
        </SectionBox>
      )}

      <ReportSignature />
    </ReportPageFrame>
  );
}