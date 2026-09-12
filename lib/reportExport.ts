// lib/reportExport.ts
//
// Export Laporan (Operasional & Keuangan) ke PDF dan Excel — Priority #10.
// Semua data yang dipakai di sini SAMA PERSIS dengan yang dirender di
// app/laporan/preview/page.tsx (OperationalExportData / FinancialReport) — tidak ada
// query baru, murni presentasi ulang data yang sudah diambil oleh halaman preview.
//
// jsPDF & xlsx murni jalan di browser, jadi fungsi-fungsi ini HARUS dipanggil dari
// client (mis. onClick tombol), bukan saat render/SSR.

import type { ResolvedPeriod } from "@/lib/reportPeriod";
import type {
  OperationalSummary,
  CorrectiveMaintenanceReport,
  PreventiveMaintenanceReport,
  BukuSakitReport,
} from "@/lib/reportQueries";
import type { FinancialReport } from "@/lib/reportFinance";
import { COST_CATEGORIES } from "@/lib/costQueries";
import type { ReportTemplateData } from "@/components/laporan/ReportTemplate";

// ============================================================
// WRAPPER GABUNGAN (Langkah 6 — Step 6.1)
//
// SEMENTARA: masih memakai mesin jsPDF/xlsx lama di bawah, hanya menghormati
// checklist section dari halaman preview. Ini akan digantikan di:
// - Step 6.2: render components/laporan/ReportTemplate.tsx yang SAMA lewat
//   html2canvas -> potong per halaman A4 -> jsPDF, supaya preview & PDF 100%
//   identik pixel-nya (bukan lagi 2 layout terpisah seperti sekarang).
// - Step 6.3: ganti ke exceljs supaya bisa embed foto bukti WO per baris.
// ============================================================
export async function exportReportPDF(data: ReportTemplateData) {
  const { sections, period } = data;
  if (sections.corrective || sections.preventive || sections.bukusakit || sections.ringkasan) {
    await exportOperationalPDF(period, {
      summary: sections.ringkasan ? data.summary : null,
      corrective: sections.corrective ? data.corrective : null,
      preventive: sections.preventive ? data.preventive : null,
      bukuSakit: sections.bukusakit ? data.bukuSakit : null,
    });
  }
  if (sections.keuangan && data.financial) {
    await exportFinancialPDF(period, data.financial);
  }
}

export async function exportReportExcel(data: ReportTemplateData) {
  const { sections, period } = data;
  if (sections.corrective || sections.preventive || sections.bukusakit || sections.ringkasan) {
    await exportOperationalExcel(period, {
      summary: sections.ringkasan ? data.summary : null,
      corrective: sections.corrective ? data.corrective : null,
      preventive: sections.preventive ? data.preventive : null,
      bukuSakit: sections.bukusakit ? data.bukuSakit : null,
    });
  }
  if (sections.keuangan && data.financial) {
    await exportFinancialExcel(period, data.financial);
  }
}

export interface OperationalExportData {
  summary: OperationalSummary | null;
  corrective: CorrectiveMaintenanceReport | null;
  preventive: PreventiveMaintenanceReport | null;
  bukuSakit: BukuSakitReport | null;
}

const formatRupiah = (n: number | null | undefined) => `Rp ${(n || 0).toLocaleString("id-ID")}`;
const formatTanggalSingkat = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

// --- Nama file bersih dari label periode, mis. "Laporan_Operasional_1_-_31_Januari_2026" ---
function buildFileName(reportType: "Operasional" | "Keuangan", period: ResolvedPeriod, ext: string) {
  const safeLabel = period.label.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `Laporan_${reportType}_${safeLabel}.${ext}`;
}

// ============================================================
// PDF EXPORT
// ============================================================
export async function exportOperationalPDF(period: ResolvedPeriod, data: OperationalExportData) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable"); // side-effect: patches jsPDF.API dengan doc.autoTable(...)

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 50;

  y = drawHeader(doc, "LAPORAN OPERASIONAL", period, y, marginX);

  // Ringkasan
  const { summary } = data;
  (doc as any).autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Availability", "WO Selesai", "MTTR", "PM Completion"]],
    body: [[
      summary?.availabilityAvgPct !== null && summary?.availabilityAvgPct !== undefined ? `${summary.availabilityAvgPct.toFixed(1)}%` : "-",
      `${summary?.totalWorkOrderSelesai ?? 0} / ${summary?.totalWorkOrder ?? 0}`,
      summary?.mttrHours !== null && summary?.mttrHours !== undefined ? `${summary.mttrHours.toFixed(1)} jam` : "-",
      `${(summary?.pmCompletionRatePct ?? 0).toFixed(0)}%`,
    ]],
    styles: { fontSize: 9, halign: "center" },
    headStyles: { fillColor: [15, 23, 42] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Corrective Maintenance
  y = drawSectionTitle(doc, "Corrective Maintenance (Work Order)", y, marginX);
  (doc as any).autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["ID WO", "Aset / Lokasi", "Kejadian", "Status", "Biaya"]],
    body:
      data.corrective && data.corrective.detailRows.length > 0
        ? data.corrective.detailRows.map((wo) => [
            wo.id,
            `${wo.assetName} — ${wo.locationName}`,
            wo.trouble || "-",
            wo.status,
            formatRupiah(wo.actualCost),
          ])
        : [["-", "Belum ada data pada periode ini.", "-", "-", "-"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 148, 136] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Preventive Maintenance
  y = ensureSpace(doc, y, marginX, "Preventive Maintenance (Checklist)");
  (doc as any).autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Tanggal", "Aset / Lokasi", "Operator", "Status"]],
    body:
      data.preventive && data.preventive.detailRows.length > 0
        ? data.preventive.detailRows.map((s) => [
            formatTanggalSingkat(s.scheduledDate),
            `${s.assetName} — ${s.locationName}`,
            s.operatorName || "-",
            s.displayStatus,
          ])
        : [["-", "Belum ada data pada periode ini.", "-", "-"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 148, 136] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Buku Sakit
  y = ensureSpace(doc, y, marginX, "Buku Sakit (Laporan Kerusakan)");
  (doc as any).autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Tanggal", "Aset / Lokasi", "Kejadian", "Urgency"]],
    body:
      data.bukuSakit && data.bukuSakit.detailRows.length > 0
        ? data.bukuSakit.detailRows.map((r) => [
            formatTanggalSingkat(r.createdAt),
            `${r.assetName} — ${r.locationName}`,
            r.issueTitle || "-",
            r.urgency || "-",
          ])
        : [["-", "Belum ada data pada periode ini.", "-", "-"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 148, 136] },
  });

  drawSignature(doc);
  doc.save(buildFileName("Operasional", period, "pdf"));
}

export async function exportFinancialPDF(period: ResolvedPeriod, data: FinancialReport) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable"); // side-effect: patches jsPDF.API dengan doc.autoTable(...)

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 50;

  y = drawHeader(doc, "LAPORAN KEUANGAN / MANAJEMEN", period, y, marginX);

  (doc as any).autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Total Biaya", "Total Anggaran", "Anggaran Terpakai"]],
    body: [[
      formatRupiah(data.totalKeseluruhan),
      formatRupiah(data.budgetTotal),
      data.budgetTotal > 0 ? `${data.realisasiPct}%` : "-",
    ]],
    styles: { fontSize: 9, halign: "center" },
    headStyles: { fillColor: [15, 23, 42] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  y = drawSectionTitle(doc, "Ringkasan per Kategori Biaya", y, marginX);
  (doc as any).autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Kategori", "Jumlah Biaya", "% dari Total"]],
    body: COST_CATEGORIES.map((cat) => {
      const total = data.totalsByCategory[cat] ?? 0;
      const pct = data.totalKeseluruhan > 0 ? Math.round((total / data.totalKeseluruhan) * 100) : 0;
      return [cat, formatRupiah(total), `${pct}%`];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 148, 136] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  y = ensureSpace(doc, y, marginX, "Rincian Transaksi Biaya");
  (doc as any).autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Tanggal", "Kategori", "Deskripsi", "Lokasi", "Biaya"]],
    body:
      data.detailRows.length > 0
        ? data.detailRows.map((tx) => [
            formatTanggalSingkat(tx.date),
            tx.category,
            tx.description,
            tx.location || "-",
            formatRupiah(tx.amount),
          ])
        : [["-", "-", "Belum ada data pada periode ini.", "-", "-"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 148, 136] },
  });

  drawSignature(doc);
  doc.save(buildFileName("Keuangan", period, "pdf"));
}

// --- Helper PDF ---
function drawHeader(doc: any, title: string, period: ResolvedPeriod, y: number, marginX: number): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INU Asset", marginX, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("PT. ITDC Nusantara Utilitas", marginX, y + 14);
  doc.text(`Dicetak: ${formatTanggalSingkat(new Date().toISOString())}`, 555 - marginX, y, { align: "right" });
  doc.setLineWidth(1);
  doc.line(marginX, y + 24, 555 - marginX, y + 24);

  y += 50;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 297.5, y, { align: "center" });
  y += 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Seluruh Lokasi — ${period.label}`, 297.5, y, { align: "center" });
  return y + 20;
}

function drawSectionTitle(doc: any, title: string, y: number, marginX: number): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), marginX, y);
  return y + 10;
}

// --- Cegah judul section terpotong di akhir halaman: kalau ruang tersisa < 120pt, pindah halaman baru ---
function ensureSpace(doc: any, y: number, marginX: number, nextTitle: string): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 120) {
    doc.addPage();
    y = 50;
  }
  return drawSectionTitle(doc, nextTitle, y, marginX);
}

function drawSignature(doc: any) {
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = (doc as any).lastAutoTable.finalY + 60;
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 80;
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Disiapkan Oleh:", 40, y);
  doc.text("Disetujui Oleh:", 555 - 40, y, { align: "right" });
  doc.setLineWidth(0.5);
  doc.line(40, y + 50, 200, y + 50);
  doc.line(395, y + 50, 555 - 40, y + 50);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Supervisor Pemeliharaan", 40, y + 62);
  doc.text("General Manager", 555 - 40, y + 62, { align: "right" });
}

// ============================================================
// EXCEL EXPORT
// ============================================================
export async function exportOperationalExcel(period: ResolvedPeriod, data: OperationalExportData) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const { summary } = data;
  const ringkasanSheet = XLSX.utils.aoa_to_sheet([
    ["Laporan Operasional"],
    ["Periode", period.label],
    [],
    ["Availability (%)", summary?.availabilityAvgPct ?? 0],
    ["Total Work Order", summary?.totalWorkOrder ?? 0],
    ["Work Order Selesai", summary?.totalWorkOrderSelesai ?? 0],
    ["MTTR (jam)", summary?.mttrHours ?? 0],
    ["PM Completion Rate (%)", summary?.pmCompletionRatePct ?? 0],
  ]);
  XLSX.utils.book_append_sheet(wb, ringkasanSheet, "Ringkasan");

  const correctiveSheet = XLSX.utils.json_to_sheet(
    (data.corrective?.detailRows || []).map((wo) => ({
      "ID WO": wo.id,
      Aset: wo.assetName,
      Lokasi: wo.locationName,
      Kejadian: wo.trouble || "-",
      Status: wo.status,
      "Biaya (Rp)": wo.actualCost || 0,
    }))
  );
  XLSX.utils.book_append_sheet(wb, correctiveSheet, "Corrective Maintenance");

  const preventiveSheet = XLSX.utils.json_to_sheet(
    (data.preventive?.detailRows || []).map((s) => ({
      Tanggal: formatTanggalSingkat(s.scheduledDate),
      Aset: s.assetName,
      Lokasi: s.locationName,
      Operator: s.operatorName || "-",
      Status: s.displayStatus,
    }))
  );
  XLSX.utils.book_append_sheet(wb, preventiveSheet, "Preventive Maintenance");

  const bukuSakitSheet = XLSX.utils.json_to_sheet(
    (data.bukuSakit?.detailRows || []).map((r) => ({
      Tanggal: formatTanggalSingkat(r.createdAt),
      Aset: r.assetName,
      Lokasi: r.locationName,
      Kejadian: r.issueTitle || "-",
      Urgency: r.urgency || "-",
    }))
  );
  XLSX.utils.book_append_sheet(wb, bukuSakitSheet, "Buku Sakit");

  XLSX.writeFile(wb, buildFileName("Operasional", period, "xlsx"));
}

export async function exportFinancialExcel(period: ResolvedPeriod, data: FinancialReport) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const ringkasanSheet = XLSX.utils.aoa_to_sheet([
    ["Laporan Keuangan / Manajemen"],
    ["Periode", period.label],
    [],
    ["Total Biaya (Rp)", data.totalKeseluruhan],
    ["Total Anggaran (Rp)", data.budgetTotal],
    ["Anggaran Terpakai (%)", data.budgetTotal > 0 ? data.realisasiPct : "-"],
    [],
    ["Kategori", "Jumlah Biaya (Rp)", "% dari Total"],
    ...COST_CATEGORIES.map((cat) => [
      cat,
      data.totalsByCategory[cat] ?? 0,
      data.totalKeseluruhan > 0 ? Math.round(((data.totalsByCategory[cat] ?? 0) / data.totalKeseluruhan) * 100) : 0,
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, ringkasanSheet, "Ringkasan");

  const transaksiSheet = XLSX.utils.json_to_sheet(
    data.detailRows.map((tx) => ({
      Tanggal: formatTanggalSingkat(tx.date),
      Kategori: tx.category,
      Deskripsi: tx.description,
      Lokasi: tx.location || "-",
      "Biaya (Rp)": tx.amount,
    }))
  );
  XLSX.utils.book_append_sheet(wb, transaksiSheet, "Rincian Transaksi");

  const budgetSheet = XLSX.utils.json_to_sheet(
    data.budgetMonths.map((m) => ({
      Bulan: m.month,
      Tahun: m.year,
      "Anggaran (Rp)": m.amount,
    }))
  );
  XLSX.utils.book_append_sheet(wb, budgetSheet, "Anggaran per Bulan");

  XLSX.writeFile(wb, buildFileName("Keuangan", period, "xlsx"));
}