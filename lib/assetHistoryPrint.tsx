// lib/assetHistoryPrint.tsx
//
// Cetak riwayat per aset (dipanggil dari halaman detail aset):
//   - "Riwayat Kerusakan"    -> damage_reports (Buku Sakit) + work_orders (korektif) aset itu
//   - "Riwayat Pemeliharaan" -> maintenance_schedules (pencegahan) aset itu
//
// Memakai pola print yang SAMA dengan Laporan (bukan window.print()/@media print):
//   susun halaman -> html2canvas per halaman -> jsPDF -> dimuat ke <iframe> tersembunyi -> print().
// Kop surat, bungkus halaman, nomor halaman, tanda tangan, style tabel, dan ukuran kertas
// (A4_WIDTH_MM / A4_HEIGHT_MM / A4_MARGIN_MM) diambil dari components/laporan/ReportTemplate.tsx,
// serta helper print dari lib/reportExport.ts, jadi kalau ukuran kertas Laporan diubah
// (mis. revisi B4), cetak riwayat ini otomatis ikut.
//
// Halaman disusun dari "blok" atomik (judul, info aset, 1 baris tabel, tanda tangan) yang
// tingginya diukur nyata lewat DOM tersembunyi, sehingga 1 baris tidak pernah terpotong di
// batas halaman dan setiap halaman punya kop + header kolom sendiri.

import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  ReportHeader,
  ReportPageFrame,
  ReportPageNumber,
  ReportSignature,
  tableStyle,
  theadRowStyle,
  thStyle,
  tdStyle,
  tdCenterStyle,
  tdRightStyle,
  formatRupiah,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  A4_MARGIN_MM,
} from "@/components/laporan/ReportTemplate";
import { waitForImagesLoaded, printPdfViaHiddenIframe } from "@/lib/reportExport";

// ------------------------------------------------------------
// TIPE DATA
// ------------------------------------------------------------
export interface AssetPrintInfo {
  id: string;
  name: string;
  type: string | null;
  locationName: string;
  ownership: string | null;
}

// "" = tidak dibatasi. Keduanya kosong = seluruh riwayat sejak aset didaftarkan.
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface DamageReportRow {
  id: string;
  issue_title: string | null;
  description: string | null;
  reporter_name: string | null;
  urgency: string | null;
  created_at: string;
}

export interface WorkOrderRow {
  id: string;
  tgl: string | null;
  trouble: string | null;
  tech_name: string | null;
  supervisor: string | null;
  tindak_lanjut: string | null;
  status: string | null;
  cost_part: number | null;
  cost_service: number | null;
  actual_cost: number | null;
  damage_report_id: string | null;
  is_emergency: boolean | null;
  completed_at: string | null;
  created_at: string;
}

export interface MaintenanceRow {
  id: string;
  scheduled_date: string | null;
  status: string | null;
  operator_name: string | null;
  completed_at: string | null;
}

// ------------------------------------------------------------
// HELPER TANGGAL (semua dihitung dalam WITA, sama seperti bagian lain aplikasi)
// ------------------------------------------------------------
const toWitaDate = (ts: string): string =>
  new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" }); // YYYY-MM-DD

const fmtDate = (dateStr: string | null | undefined): string =>
  dateStr
    ? new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";

const fmtTimestampDate = (ts: string | null | undefined): string => (ts ? fmtDate(toWitaDate(ts)) : "-");

const inRange = (date: string, range: DateRange): boolean =>
  (!range.start || date >= range.start) && (!range.end || date <= range.end);

export function formatRangeLabel(range: DateRange): string {
  if (!range.start && !range.end) return "Seluruh riwayat sejak aset didaftarkan";
  if (range.start && range.end) return `${fmtDate(range.start)} s.d. ${fmtDate(range.end)}`;
  if (range.start) return `Sejak ${fmtDate(range.start)}`;
  return `Sampai ${fmtDate(range.end)}`;
}

// ------------------------------------------------------------
// RIWAYAT KERUSAKAN: gabungan damage_reports + work_orders
// ------------------------------------------------------------
export interface DamageEntry {
  key: string;
  date: string; // YYYY-MM-DD (tanggal laporan; untuk WO tanpa laporan = tanggal terbit WO)
  title: string;
  description: string | null;
  reporter: string | null;
  wos: WorkOrderRow[];
}

// 1 baris = 1 kejadian kerusakan. WO digabung ke laporan asalnya lewat damage_report_id.
// Khusus Perbaikan Mendadak: sistem membuat laporan Buku Sakit + WO sekaligus tapi WO-nya TIDAK
// menyimpan damage_report_id, jadi dicocokkan lewat judul yang sama & waktu buat berdekatan
// (<= 5 menit), supaya 1 kejadian tidak muncul dobel. WO yang tetap tidak punya laporan
// (mis. dibuat langsung lewat "Buat Work Order") tampil sebagai baris sendiri.
export function buildDamageEntries(reports: DamageReportRow[], workOrders: WorkOrderRow[]): DamageEntry[] {
  const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();
  const woByReport = new Map<string, WorkOrderRow[]>();
  const unlinked: WorkOrderRow[] = [];

  for (const wo of workOrders) {
    if (wo.damage_report_id) {
      const list = woByReport.get(wo.damage_report_id) || [];
      list.push(wo);
      woByReport.set(wo.damage_report_id, list);
    } else {
      unlinked.push(wo);
    }
  }

  const entries: DamageEntry[] = reports.map((r) => ({
    key: `rep-${r.id}`,
    date: toWitaDate(r.created_at),
    title: r.issue_title || "-",
    description: r.description || null,
    reporter: r.reporter_name || null,
    wos: woByReport.get(r.id) || [],
  }));

  const entryByReportId = new Map(reports.map((r, i) => [r.id, { report: r, entry: entries[i] }]));

  for (const wo of unlinked) {
    let matched: DamageEntry | null = null;
    if (wo.is_emergency) {
      const woTime = new Date(wo.created_at).getTime();
      for (const { report, entry } of entryByReportId.values()) {
        if (entry.wos.length > 0) continue;
        if (norm(report.issue_title) !== norm(wo.trouble)) continue;
        if (Math.abs(new Date(report.created_at).getTime() - woTime) <= 5 * 60 * 1000) {
          matched = entry;
          break;
        }
      }
    }
    if (matched) {
      matched.wos.push(wo);
    } else {
      entries.push({
        key: `wo-${wo.id}`,
        date: wo.tgl || toWitaDate(wo.created_at),
        title: wo.trouble || "-",
        description: null,
        reporter: null,
        wos: [wo],
      });
    }
  }

  // Terlama -> terbaru (urutan kronologis, cocok untuk arsip riwayat cetak)
  return entries.sort((a, b) => (a.date === b.date ? a.key.localeCompare(b.key) : a.date.localeCompare(b.date)));
}

const woCost = (wo: WorkOrderRow): number =>
  wo.actual_cost != null ? wo.actual_cost : (wo.cost_part || 0) + (wo.cost_service || 0);

// ------------------------------------------------------------
// MODEL DOKUMEN GENERIK (dipakai kedua jenis cetak)
// ------------------------------------------------------------
interface HistoryDoc {
  title: string;
  asset: AssetPrintInfo;
  periodLabel: string;
  colWidths: string[];
  thead: React.ReactNode;
  rows: { id: string; content: React.ReactNode }[];
}

const MM_TO_PX = 96 / 25.4;
const BLOCK_GAP_PX = 16; // sama dengan gap ReportPageFrame
const SAFETY_BUFFER_PX = 6 * MM_TO_PX;
const PAGE_ID_PREFIX = "asset-history-page-";

type Block =
  | { id: string; kind: "title" }
  | { id: string; kind: "info" }
  | { id: string; kind: "row"; content: React.ReactNode }
  | { id: string; kind: "signature" };

function TitleBlock({ doc }: { doc: HistoryDoc }) {
  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
      <h1 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", textDecoration: "underline", margin: 0 }}>
        {doc.title}
      </h1>
      <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>
        {doc.asset.id} — {doc.asset.name}
      </p>
    </div>
  );
}

function InfoBlock({ doc }: { doc: HistoryDoc }) {
  const items: [string, string][] = [
    ["Kode Aset", doc.asset.id],
    ["Nama Aset", doc.asset.name],
    ["Tipe Aset", doc.asset.type || "-"],
    ["Lokasi", doc.asset.locationName || "-"],
    ["Kepemilikan", doc.asset.ownership || "-"],
    ["Periode", doc.periodLabel],
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "80px 1fr 80px 1fr",
        columnGap: 10,
        rowGap: 4,
        fontSize: 9,
        padding: 8,
        border: "1px solid #CBD5E1",
        background: "#F8FAFC",
      }}
    >
      {items.map(([label, value]) => (
        <React.Fragment key={label}>
          <span style={{ color: "#64748B", fontWeight: 700 }}>{label}</span>
          <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{value}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function renderBlock(block: Block, doc: HistoryDoc): React.ReactNode {
  switch (block.kind) {
    case "title":
      return <TitleBlock doc={doc} />;
    case "info":
      return <InfoBlock doc={doc} />;
    case "signature":
      return <ReportSignature />;
    case "row":
      // 1 baris dibungkus tabel mini dengan colgroup sama persis, supaya tinggi terukur
      // sama dengan tabel final berisi banyak baris.
      return (
        <table style={tableStyle}>
          <colgroup>
            {doc.colWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>{block.content}</tbody>
        </table>
      );
  }
}

// Ukur tinggi kop surat (asli) + tiap blok dengan benar-benar merender ke DOM tersembunyi.
function measure(blocks: Block[], doc: HistoryDoc): { headerPx: number; heights: number[] } {
  const contentWidthPx = (A4_WIDTH_MM - 2 * A4_MARGIN_MM) * MM_TO_PX;
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${contentWidthPx}px`;
  container.style.visibility = "hidden";
  container.style.fontFamily = "Poppins, Arial, Helvetica, sans-serif";
  document.body.appendChild(container);

  const root = createRoot(container);
  flushSync(() => {
    root.render(
      <div style={{ display: "flex", flexDirection: "column", gap: `${BLOCK_GAP_PX}px` }}>
        <div>
          <ReportHeader />
        </div>
        {blocks.map((b) => (
          <div key={b.id}>{renderBlock(b, doc)}</div>
        ))}
      </div>
    );
  });

  const wrapper = container.firstElementChild as HTMLElement | null;
  let headerPx = 0;
  const heights: number[] = [];
  if (wrapper) {
    headerPx = (wrapper.children[0] as HTMLElement).offsetHeight;
    for (let i = 1; i < wrapper.children.length; i++) {
      heights.push((wrapper.children[i] as HTMLElement).offsetHeight);
    }
  }

  root.unmount();
  document.body.removeChild(container);
  return { headerPx, heights };
}

function paginate(blocks: Block[], heights: number[], availablePx: number): Block[][] {
  const pages: Block[][] = [[]];
  let current = 0;

  blocks.forEach((block, i) => {
    const h = heights[i] ?? 0;
    const isFirstOnPage = pages[pages.length - 1].length === 0;
    const needed = isFirstOnPage ? h : h + BLOCK_GAP_PX;

    if (!isFirstOnPage && current + needed > availablePx) {
      pages.push([block]);
      current = h;
    } else {
      pages[pages.length - 1].push(block);
      current += needed;
    }
  });

  return pages;
}

// Baris berurutan dalam 1 halaman digabung jadi SATU <table> dengan thead segar.
function renderPage(pageBlocks: Block[], doc: HistoryDoc): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < pageBlocks.length) {
    const block = pageBlocks[i];
    if (block.kind !== "row") {
      nodes.push(<React.Fragment key={block.id}>{renderBlock(block, doc)}</React.Fragment>);
      i++;
      continue;
    }

    const chunk: React.ReactNode[] = [];
    const startIdx = i;
    while (i < pageBlocks.length && pageBlocks[i].kind === "row") {
      const b = pageBlocks[i] as Extract<Block, { kind: "row" }>;
      chunk.push(<React.Fragment key={b.id}>{b.content}</React.Fragment>);
      i++;
    }
    nodes.push(
      <table key={`table-${startIdx}`} style={tableStyle}>
        <colgroup>
          {doc.colWidths.map((w, ci) => (
            <col key={ci} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>{doc.thead}</thead>
        <tbody>{chunk}</tbody>
      </table>
    );
  }
  return nodes;
}

async function renderAndPrint(doc: HistoryDoc): Promise<void> {
  const blocks: Block[] = [
    { id: "title", kind: "title" },
    { id: "info", kind: "info" },
    ...doc.rows.map((r): Block => ({ id: `row-${r.id}`, kind: "row", content: r.content })),
    { id: "signature", kind: "signature" },
  ];

  const { headerPx, heights } = measure(blocks, doc);
  const availablePx = (A4_HEIGHT_MM - 2 * A4_MARGIN_MM) * MM_TO_PX - headerPx - BLOCK_GAP_PX - SAFETY_BUFFER_PX;
  const pages = paginate(blocks, heights, availablePx);
  const totalPages = pages.length;
  const pageIds = pages.map((_, idx) => `${PAGE_ID_PREFIX}${idx}`);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(
        <div>
          {pages.map((pageBlocks, idx) => (
            <ReportPageFrame
              key={pageIds[idx]}
              id={pageIds[idx]}
              fixedHeight
              footer={<ReportPageNumber page={idx + 1} totalPages={totalPages} />}
            >
              {renderPage(pageBlocks, doc)}
            </ReportPageFrame>
          ))}
        </div>
      );
    });

    // Format kertas mengikuti konstanta di ReportTemplate.tsx (bukan "a4" hardcode)
    const orientation = A4_WIDTH_MM > A4_HEIGHT_MM ? "landscape" : "portrait";
    const pdf = new jsPDF({ unit: "mm", format: [A4_WIDTH_MM, A4_HEIGHT_MM], orientation });

    for (let i = 0; i < pageIds.length; i++) {
      const pageEl = document.getElementById(pageIds[i]);
      if (!pageEl) continue;
      await waitForImagesLoaded(pageEl);
      const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png", 1.0);
      if (i > 0) pdf.addPage([A4_WIDTH_MM, A4_HEIGHT_MM], orientation);
      pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
    }

    const blobUrl = pdf.output("bloburl") as unknown as string;
    await printPdfViaHiddenIframe(blobUrl);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

// ------------------------------------------------------------
// API 1: CETAK RIWAYAT KERUSAKAN
// Return false kalau tidak ada data pada rentang tanggal (tidak ada yang dicetak).
// ------------------------------------------------------------
export async function printDamageHistory(
  asset: AssetPrintInfo,
  range: DateRange,
  reports: DamageReportRow[],
  workOrders: WorkOrderRow[]
): Promise<boolean> {
  const entries = buildDamageEntries(reports, workOrders).filter((e) => inRange(e.date, range));
  if (entries.length === 0) return false;

  const cell = (children: React.ReactNode) => <td style={tdStyle}>{children}</td>;
  const dash = <span style={{ color: "#94A3B8" }}>-</span>;

  const doc: HistoryDoc = {
    title: "Riwayat Kerusakan Aset",
    asset,
    periodLabel: formatRangeLabel(range),
    colWidths: ["4%", "11%", "22%", "11%", "12%", "11%", "19%", "10%"],
    thead: (
      <tr style={theadRowStyle}>
        <th style={{ ...thStyle, textAlign: "center" }}>No</th>
        <th style={thStyle}>Tanggal</th>
        <th style={thStyle}>Kerusakan</th>
        <th style={thStyle}>Pelapor</th>
        <th style={thStyle}>No. WO / Status</th>
        <th style={thStyle}>Pelaksana</th>
        <th style={thStyle}>Tindakan Perbaikan</th>
        <th style={{ ...thStyle, textAlign: "right" }}>Biaya</th>
      </tr>
    ),
    rows: entries.map((e, idx) => {
      const totalCost = e.wos.reduce((sum, wo) => sum + woCost(wo), 0);
      return {
        id: e.key,
        content: (
          <tr>
            <td style={tdCenterStyle}>{idx + 1}</td>
            {cell(fmtDate(e.date))}
            {cell(
              <>
                <div style={{ fontWeight: 700 }}>{e.title}</div>
                {e.description && <div style={{ color: "#475569", marginTop: 2 }}>{e.description}</div>}
              </>
            )}
            {cell(e.reporter || dash)}
            {cell(
              e.wos.length > 0
                ? e.wos.map((wo) => (
                    <div key={wo.id} style={{ marginBottom: 2 }}>
                      <div style={{ fontWeight: 700 }}>{wo.id}</div>
                      <div style={{ color: "#475569" }}>
                        {wo.status || "-"}
                        {wo.status === "Selesai" && wo.completed_at ? ` (${fmtTimestampDate(wo.completed_at)})` : ""}
                      </div>
                    </div>
                  ))
                : dash
            )}
            {cell(e.wos.length > 0 ? e.wos.map((wo) => wo.tech_name).filter(Boolean).join(", ") || dash : dash)}
            {cell(
              e.wos.length > 0
                ? e.wos.map((wo) => wo.tindak_lanjut?.trim()).filter(Boolean).join("; ") || dash
                : dash
            )}
            <td style={tdRightStyle}>{e.wos.length > 0 && totalCost > 0 ? formatRupiah(totalCost) : "-"}</td>
          </tr>
        ),
      };
    }),
  };

  await renderAndPrint(doc);
  return true;
}

// ------------------------------------------------------------
// API 2: CETAK RIWAYAT PEMELIHARAAN (semua status: Terjadwal, Selesai, dst)
// ------------------------------------------------------------
export async function printMaintenanceHistory(
  asset: AssetPrintInfo,
  range: DateRange,
  schedules: MaintenanceRow[]
): Promise<boolean> {
  const rows = schedules
    .filter((s) => s.scheduled_date && inRange(s.scheduled_date, range))
    .sort((a, b) => (a.scheduled_date as string).localeCompare(b.scheduled_date as string));
  if (rows.length === 0) return false;

  const doc: HistoryDoc = {
    title: "Riwayat Pemeliharaan Aset",
    asset,
    periodLabel: formatRangeLabel(range),
    colWidths: ["6%", "24%", "30%", "20%", "20%"],
    thead: (
      <tr style={theadRowStyle}>
        <th style={{ ...thStyle, textAlign: "center" }}>No</th>
        <th style={thStyle}>Tanggal Jadwal</th>
        <th style={thStyle}>Operator</th>
        <th style={thStyle}>Status</th>
        <th style={thStyle}>Tanggal Selesai</th>
      </tr>
    ),
    rows: rows.map((s, idx) => ({
      id: s.id,
      content: (
        <tr>
          <td style={tdCenterStyle}>{idx + 1}</td>
          <td style={tdStyle}>{fmtDate(s.scheduled_date)}</td>
          <td style={tdStyle}>{s.operator_name || "-"}</td>
          <td style={tdStyle}>{s.status || "-"}</td>
          <td style={tdStyle}>{fmtTimestampDate(s.completed_at)}</td>
        </tr>
      ),
    })),
  };

  await renderAndPrint(doc);
  return true;
}