// components/laporan/ReportTemplate.tsx
//
// SINGLE SOURCE OF TRUTH untuk tampilan kertas laporan (Langkah 6, poin 1 & 2).
// Komponen ini murni presentasional (tidak fetch data sendiri) dan dipakai oleh:
// 1. app/laporan/preview/page.tsx  -> dirender langsung di browser (live preview)
// 2. lib/reportExport.ts           -> dirender ke DOM offscreen lalu di-capture
//                                     per halaman A4 jadi PDF (html2canvas + jsPDF)
//
// Karena dipakai utk PDF juga, style di sini SENGAJA pakai warna solid (bukan
// class Tailwind dark:) dan ukuran fixed dalam mm supaya hasil identik di
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
import { ReportSectionSelection } from "@/lib/reportSections";

const formatRupiah = (n: number | null | undefined) => `Rp ${(n || 0).toLocaleString("id-ID")}`;
const formatTanggalSingkat = (d: string | null | undefined) =>
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

// id DOM yg dipakai lib/reportExport.ts untuk mencari kertas ini saat capture ke PDF.
export const REPORT_TEMPLATE_DOM_ID = "report-template-a4";

export default function ReportTemplate({ data }: { data: ReportTemplateData }) {
  const { period, sections, summary, corrective, preventive, bukuSakit, financial } = data;

  return (
    <div
      id={REPORT_TEMPLATE_DOM_ID}
      style={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: `${A4_MARGIN_MM}mm`,
        background: "#FFFFFF",
        color: "#0F172A",
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
      className="report-a4-page"
    >
      {/* Kop Surat */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0F172A", paddingBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 40, height: 40, background: "#0D9488", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 20 }}>
            I
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>INU Asset</h2>
            <p style={{ fontSize: 10, color: "#94A3B8", margin: 0 }}>PT. ITDC Nusantara Utilitas</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: "#475569", margin: 0 }}>DOKUMEN INTERNAL</p>
          <p style={{ fontSize: 8, color: "#94A3B8", margin: 0 }}>Dicetak: {formatTanggalSingkat(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Judul */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", textDecoration: "underline", margin: 0 }}>
          Laporan Operasional &amp; Keuangan
        </h1>
        <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>
          Seluruh Lokasi — {period.label}
        </p>
      </div>

      {/* Ringkasan Operasional */}
      {sections.ringkasan && (
        <SectionBox title="Ringkasan Operasional">
          <table style={tableStyle}>
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
        </SectionBox>
      )}

      {/* Corrective Maintenance */}
      {sections.corrective && (
        <SectionBox title="Corrective Maintenance (Work Order)">
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>ID WO</th>
                <th style={thStyle}>Aset / Lokasi</th>
                <th style={thStyle}>Kejadian</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Biaya</th>
              </tr>
            </thead>
            <tbody>
              {!corrective || corrective.detailRows.length === 0 ? (
                <EmptyRow colSpan={5} />
              ) : (
                corrective.detailRows.map((wo) => (
                  <tr key={wo.id}>
                    <td style={tdStyle}>{wo.id}</td>
                    <td style={tdStyle}>{wo.assetName} — {wo.locationName}</td>
                    <td style={{ ...tdStyle, fontStyle: "italic" }}>{wo.trouble || "-"}</td>
                    <td style={tdCenterStyle}>{wo.status}</td>
                    <td style={tdRightStyle}>{formatRupiah(wo.actualCost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SectionBox>
      )}

      {/* Preventive Maintenance */}
      {sections.preventive && (
        <SectionBox title="Preventive Maintenance (Checklist)">
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Tanggal</th>
                <th style={thStyle}>Aset / Lokasi</th>
                <th style={thStyle}>Operator</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {!preventive || preventive.detailRows.length === 0 ? (
                <EmptyRow colSpan={4} />
              ) : (
                preventive.detailRows.map((s) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{formatTanggalSingkat(s.scheduledDate)}</td>
                    <td style={tdStyle}>{s.assetName} — {s.locationName}</td>
                    <td style={tdStyle}>{s.operatorName || "-"}</td>
                    <td style={tdCenterStyle}>{s.displayStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SectionBox>
      )}

      {/* Buku Sakit */}
      {sections.bukusakit && (
        <SectionBox title="Buku Sakit (Laporan Kerusakan)">
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Tanggal</th>
                <th style={thStyle}>Aset / Lokasi</th>
                <th style={thStyle}>Kejadian</th>
                <th style={thStyle}>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {!bukuSakit || bukuSakit.detailRows.length === 0 ? (
                <EmptyRow colSpan={4} />
              ) : (
                bukuSakit.detailRows.map((r) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{formatTanggalSingkat(r.createdAt)}</td>
                    <td style={tdStyle}>{r.assetName} — {r.locationName}</td>
                    <td style={{ ...tdStyle, fontStyle: "italic" }}>{r.issueTitle || "-"}</td>
                    <td style={tdCenterStyle}>{r.urgency || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SectionBox>
      )}

      {/* Ringkasan Keuangan */}
      {sections.keuangan && (
        <SectionBox title="Ringkasan Keuangan">
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <SummaryBox label="Total Biaya" value={formatRupiah(financial?.totalKeseluruhan)} />
            <SummaryBox label="Total Anggaran" value={formatRupiah(financial?.budgetTotal)} />
            <SummaryBox
              label="Anggaran Terpakai"
              value={financial && financial.budgetTotal > 0 ? `${financial.realisasiPct}%` : "-"}
            />
          </div>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Kategori</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Jumlah Biaya</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% dari Total</th>
              </tr>
            </thead>
            <tbody>
              {COST_CATEGORIES.map((cat) => {
                const total = financial?.totalsByCategory[cat] ?? 0;
                const pct = financial && financial.totalKeseluruhan > 0 ? Math.round((total / financial.totalKeseluruhan) * 100) : 0;
                return (
                  <tr key={cat}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{cat}</td>
                    <td style={tdRightStyle}>{formatRupiah(total)}</td>
                    <td style={tdRightStyle}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionBox>
      )}

      {/* Tanda Tangan */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 24, marginTop: "auto" }}>
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
    </div>
  );
}

// ============================================================
// STYLE HELPERS (inline style dipakai supaya identik saat di-capture html2canvas)
// ============================================================
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 9 };
const theadRowStyle: React.CSSProperties = { background: "#F1F5F9" };
const thStyle: React.CSSProperties = { border: "1px solid #CBD5E1", padding: 6, textAlign: "left" };
const tdStyle: React.CSSProperties = { border: "1px solid #CBD5E1", padding: 6 };
const tdCenterStyle: React.CSSProperties = { ...tdStyle, textAlign: "center" };
const tdRightStyle: React.CSSProperties = { ...tdStyle, textAlign: "right" };

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, breakInside: "avoid" }}>
      <h3 style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", paddingBottom: 4, margin: 0 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: 10, background: "#F8FAFC", borderRadius: 8, border: "1px solid #F1F5F9", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: 8, color: "#475569", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900 }}>{value}</span>
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ ...tdStyle, textAlign: "center", fontStyle: "italic", color: "#94A3B8", padding: 16 }}>
        Belum ada data pada periode ini.
      </td>
    </tr>
  );
}