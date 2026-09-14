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
  CorrectiveWorkOrderRow,
  PreventiveMaintenanceReport,
  BukuSakitReport,
} from "@/lib/reportQueries";
import type { FinancialReport } from "@/lib/reportFinance";
import { COST_CATEGORIES } from "@/lib/costQueries";
import type { ReportTemplateData } from "@/components/laporan/ReportTemplate";
import { A4_WIDTH_MM, A4_HEIGHT_MM } from "@/components/laporan/ReportTemplate";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Menunggu semua <img> di dalam kertas laporan (mis. logo) selesai loading,
// supaya tidak ke-capture blank saat html2canvas jalan lebih cepat dari loading gambar.
async function waitForImagesLoaded(container: HTMLElement) {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
    )
  );
}

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
// ============================================================
// EXPORT PDF — Step 6.2 (REVISI: paginasi nyata per-halaman)
//
// Alur baru: bangun N kertas A4 terpisah (masing2 dg <ReportHeader/> sendiri,
// tanpa baris tabel yg kepotong) lewat lib/reportPaginator.tsx, lalu
// html2canvas SATU-SATU per halaman (bukan 1 screenshot raksasa yg dipotong
// buta seperti sebelumnya). Ini menjawab 3 hal:
// - Tabel >10 baris: tetap ditulis semua, tidak ada pagination browsing spt di /laporan.
// - Laporan panjang: otomatis jadi N halaman A4.
// - Header tiap halaman: SAMA, karena tiap halaman punya <ReportHeader/> sendiri.
// ============================================================
// mode "download" -> langsung men-save file .pdf (tombol "Download PDF")
// mode "print"    -> buka PDF yg sama di tab baru & langsung munculkan dialog print
//                    browser (tombol "Cetak"), supaya hasil CETAK 100% identik
//                    dengan hasil DOWNLOAD — sama-sama render dari pageIds yg
//                    sama, cuma beda aksi akhirnya (save vs print).
export async function exportReportPDF(data: ReportTemplateData, mode: "download" | "print" = "download") {
  const { buildPaginatedReportDOM } = await import("@/lib/reportPaginator");
  const { pageIds, cleanup } = await buildPaginatedReportDOM(data);

  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < pageIds.length; i++) {
      const pageEl = document.getElementById(pageIds[i]);
      if (!pageEl) continue;

      await waitForImagesLoaded(pageEl);

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    }

    if (mode === "print") {
      // Cetak TANPA pindah halaman/tab baru: PDF yg sudah jadi (dari pipeline
      // reportPaginator.tsx + html2canvas yg sama persis dg tombol Download)
      // dimuat ke iframe tersembunyi, lalu print() dipanggil dari dalam iframe
      // itu begitu selesai load. User tetap di halaman preview seperti biasa.
      const blobUrl = pdf.output("bloburl") as unknown as string;
      await printPdfViaHiddenIframe(blobUrl);
    } else {
      const safeLabel = data.period.label.replace(/[^a-zA-Z0-9]+/g, "_");
      pdf.save(`Laporan_INU_Asset_${safeLabel}.pdf`);
    }
  } finally {
    cleanup();
  }
}

// Buat <iframe> tak terlihat, muat PDF blob di dalamnya, tunggu sampai
// benar-benar termuat, lalu panggil window.print() dari CONTEXT iframe
// tsb (bukan window utama) supaya yg ke-print cuma isi PDF-nya.
// PENTING: promise di-resolve SEGERA setelah print() dipanggil (bukan
// menunggu iframe dibuang) — supaya tombol "Cetak" di UI tidak stuck
// nunggu. Pembersihan iframe & blob URL tetap jalan di belakang layar.
function printPdfViaHiddenIframe(blobUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;

    const scheduleCleanup = () => {
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        iframe.remove();
      }, 60000);
    };

    // Jaga-jaga kalau onload tidak pernah terpanggil (mis. PDF viewer
    // internal browser "menelan" event load) — jangan sampai tombol
    // stuck selamanya menunggu.
    const failSafeTimer = setTimeout(() => {
      resolve();
      scheduleCleanup();
    }, 4000);

    iframe.onload = () => {
      clearTimeout(failSafeTimer);
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Kalau browser block print dari iframe (jarang), fallback: buka tab baru.
        window.open(blobUrl, "_blank");
      }
      resolve();
      scheduleCleanup();
    };

    document.body.appendChild(iframe);
  });
}

export async function exportReportExcel(data: ReportTemplateData, includePhotos: boolean = false) {
  const { sections, period } = data;
  if (sections.corrective || sections.preventive || sections.bukusakit || sections.ringkasan) {
    await exportOperationalExcel(
      period,
      {
        summary: sections.ringkasan ? data.summary : null,
        corrective: sections.corrective ? data.corrective : null,
        preventive: sections.preventive ? data.preventive : null,
        bukuSakit: sections.bukusakit ? data.bukuSakit : null,
      },
      includePhotos
    );
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
// EXCEL EXPORT — Step 6.3
//
// Diganti dari "xlsx" ke "exceljs" karena sheet Work Order (Corrective
// Maintenance) sekarang butuh EMBED FOTO per baris, meniru format Excel WO
// yang sudah dipakai perusahaan (1 sheet per aset, judul = nama aset,
// kolom: NO | TGL | FOTO | LOKASI | MASALAH (TROUBLE) | INDIKASI PENYEBAB |
// TINDAKAN | PELAKSANA | PENGAWAS | KET).
// ============================================================

const WO_SHEET_HEADERS = [
  "NO",
  "TGL",
  "FOTO",
  "LOKASI",
  "MASALAH (TROUBLE)",
  "INDIKASI PENYEBAB",
  "TINDAKAN",
  "PELAKSANA",
  "PENGAWAS",
  "KET",
];
const WO_SHEET_COL_WIDTHS = [6, 13, 20, 16, 22, 26, 30, 18, 16, 24];

// Ambil bytes gambar dari URL (Supabase Storage) supaya bisa di-embed exceljs.
// Kalau gagal (network/format tak dikenal), balikin null — baris tetap
// ditulis, cuma kolom FOTO kosong, tidak menggagalkan export secara keseluruhan.
async function fetchImageForEmbed(url: string): Promise<{ buffer: ArrayBuffer; extension: "png" | "jpeg" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "";
    const extension: "png" | "jpeg" = contentType.includes("png") ? "png" : "jpeg";
    return { buffer, extension };
  } catch {
    return null;
  }
}

// Bangun 1 worksheet ber-format WO utk 1 aset (persis contoh_work_order.xlsx).
async function buildWorkOrderSheetForAsset(
  workbook: import("exceljs").Workbook,
  assetName: string,
  woRows: CorrectiveWorkOrderRow[],
  includePhotos: boolean
) {
  // Nama sheet Excel maks 31 char & tidak boleh mengandung: \ / ? * [ ]
  const safeSheetName = assetName.replace(/[\\/?*\[\]]/g, "").slice(0, 31) || "Aset";
  const sheet = workbook.addWorksheet(safeSheetName);

  sheet.columns = WO_SHEET_COL_WIDTHS.map((width) => ({ width }));

  // --- Judul (baris 1-2, merge, bold, center — sesuai template) ---
  sheet.mergeCells(1, 1, 2, WO_SHEET_HEADERS.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = assetName.toUpperCase();
  titleCell.font = { name: "Arial", size: 10, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 21.6;
  sheet.getRow(2).height = 21.6;

  // --- Header kolom (baris 3) ---
  const headerRow = sheet.getRow(3);
  WO_SHEET_HEADERS.forEach((label, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });

  const FOTO_COL = 3; // C
  const PHOTO_HEIGHT_PT = 90; // ~ setara contoh template (row height 72-130pt)

  for (let i = 0; i < woRows.length; i++) {
    const wo = woRows[i];
    const rowIndex = 4 + i;
    const row = sheet.getRow(rowIndex);

    const values = [
      i + 1,
      formatTanggalSingkat(wo.tgl || wo.createdAt),
      "", // FOTO diisi via addImage, bukan value teks
      wo.locationName,
      wo.masalah || "-",
      wo.indikasiPenyebab || "-",
      wo.ket || "-",
      wo.pelaksana || "-",
      wo.pengawas || "-",
      wo.status,
    ];
    values.forEach((v, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = v;
      cell.alignment = {
        vertical: "middle",
        horizontal: idx === 0 || idx === 1 || idx === 7 || idx === 8 ? "center" : "left",
        wrapText: idx !== 0 && idx !== 1,
      };
      cell.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
      };
    });

    row.height = includePhotos && wo.fotoUrl ? PHOTO_HEIGHT_PT : 30;

    if (includePhotos && wo.fotoUrl) {
      const img = await fetchImageForEmbed(wo.fotoUrl);
      if (img) {
        const imageId = workbook.addImage({ buffer: img.buffer as any, extension: img.extension });
        // Ditempel MENGISI cell kolom FOTO (row & col 0-indexed utk exceljs)
        sheet.addImage(imageId, {
          tl: { col: FOTO_COL - 1 + 0.05, row: rowIndex - 1 + 0.05 },
          ext: { width: 110, height: PHOTO_HEIGHT_PT * 1.33 }, // px, ~sesuai row height pt
          editAs: "oneCell",
        });
      }
    }
  }
}

export async function exportOperationalExcel(
  period: ResolvedPeriod,
  data: OperationalExportData,
  includePhotos: boolean = false
) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "INU Asset — Caya Darma";
  workbook.created = new Date();

  // --- Sheet Ringkasan ---
  const { summary } = data;
  const ringkasanSheet = workbook.addWorksheet("Ringkasan");
  ringkasanSheet.columns = [{ width: 28 }, { width: 20 }];
  const ringkasanRows: [string, string | number][] = [
    ["Laporan Operasional", ""],
    ["Periode", period.label],
    ["", ""],
    ["Availability (%)", summary?.availabilityAvgPct ?? 0],
    ["Total Work Order", summary?.totalWorkOrder ?? 0],
    ["Work Order Selesai", summary?.totalWorkOrderSelesai ?? 0],
    ["MTTR (jam)", summary?.mttrHours ?? 0],
    ["PM Completion Rate (%)", summary?.pmCompletionRatePct ?? 0],
  ];
  ringkasanRows.forEach((r, idx) => {
    const row = ringkasanSheet.addRow(r);
    if (idx === 0) row.getCell(1).font = { bold: true, size: 13 };
  });

  // --- Sheet(s) Work Order: 1 sheet per aset, format persis Excel WO perusahaan ---
  const woRows = data.corrective?.detailRows || [];
  const rowsByAsset = new Map<string, CorrectiveWorkOrderRow[]>();
  woRows.forEach((wo) => {
    const key = wo.assetName || wo.assetId;
    if (!rowsByAsset.has(key)) rowsByAsset.set(key, []);
    rowsByAsset.get(key)!.push(wo);
  });
  for (const [assetName, rowsForAsset] of rowsByAsset.entries()) {
    // Urutkan lama -> baru dalam 1 aset, seperti histori berjalan di contoh template
    const sorted = [...rowsForAsset].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    await buildWorkOrderSheetForAsset(workbook, assetName, sorted, includePhotos);
  }
  if (rowsByAsset.size === 0) {
    // Tidak ada WO pada periode ini — tetap sediakan 1 sheet kosong biar tidak membingungkan
    const emptySheet = workbook.addWorksheet("Corrective Maintenance");
    emptySheet.addRow(["Tidak ada Work Order pada periode ini."]);
  }

  // --- Sheet Preventive Maintenance ---
  const preventiveSheet = workbook.addWorksheet("Preventive Maintenance");
  preventiveSheet.columns = [
    { header: "Tanggal", key: "tanggal", width: 18 },
    { header: "Aset", key: "aset", width: 24 },
    { header: "Lokasi", key: "lokasi", width: 18 },
    { header: "Operator", key: "operator", width: 18 },
    { header: "Status", key: "status", width: 16 },
  ];
  preventiveSheet.getRow(1).font = { bold: true };
  (data.preventive?.detailRows || []).forEach((s) => {
    preventiveSheet.addRow({
      tanggal: formatTanggalSingkat(s.scheduledDate),
      aset: s.assetName,
      lokasi: s.locationName,
      operator: s.operatorName || "-",
      status: s.displayStatus,
    });
  });

  // --- Sheet Buku Sakit ---
  const bukuSakitSheet = workbook.addWorksheet("Buku Sakit");
  bukuSakitSheet.columns = [
    { header: "Tanggal", key: "tanggal", width: 18 },
    { header: "Aset", key: "aset", width: 24 },
    { header: "Lokasi", key: "lokasi", width: 18 },
    { header: "Kejadian", key: "kejadian", width: 30 },
    { header: "Urgency", key: "urgency", width: 14 },
  ];
  bukuSakitSheet.getRow(1).font = { bold: true };
  (data.bukuSakit?.detailRows || []).forEach((r) => {
    bukuSakitSheet.addRow({
      tanggal: formatTanggalSingkat(r.createdAt),
      aset: r.assetName,
      lokasi: r.locationName,
      kejadian: r.issueTitle || "-",
      urgency: r.urgency || "-",
    });
  });

  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildFileName("Operasional", period, "xlsx");
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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