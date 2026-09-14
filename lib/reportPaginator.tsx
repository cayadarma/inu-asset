// lib/reportPaginator.tsx
//
// Menjawab pertanyaan: "kalau laporan panjang, apa tiap halaman PDF punya
// header yang sama, dan baris tabelnya tidak kepotong?"
//
// Sebelumnya (Step 6.2) export PDF cuma screenshot 1 kertas raksasa lalu
// dipotong buta per tinggi A4 -> header cuma ada di halaman 1, dan baris
// tabel bisa kepotong pas di batas potongan.
//
// Pendekatan baru di sini:
// 1. Pecah seluruh isi laporan jadi "blok" atomik (judul, judul section,
//    1 baris tabel, box ringkasan keuangan, tanda tangan) — 1 blok TIDAK
//    PERNAH dipotong di tengah.
// 2. Render semua blok itu sekali secara offscreen (tersembunyi di layar)
//    dengan lebar yang SAMA PERSIS dengan lebar isi kertas A4, lalu ukur
//    tinggi asli tiap blok pakai DOM (offsetHeight) — bukan tebak-tebakan.
// 3. Susun blok-blok itu ke halaman2 A4 secara berurutan: selama masih
//    muat di sisa halaman, lanjut; begitu tidak muat, mulai halaman baru.
// 4. Setiap halaman dirender ulang sebagai <ReportPageFrame> LENGKAP dengan
//    <ReportHeader/> sendiri (dan baris tabel yg jadi milik section yg sama
//    akan otomatis dikelompokkan ke dalam satu <table> baru dg thead segar).
// 5. Tiap halaman itu di-screenshot SATU-SATU oleh html2canvas (bukan lagi
//    1 screenshot raksasa yg dipotong), jadi ukurannya otomatis pas 1 A4,
//    tidak ada resiko baris kepotong ataupun header hilang.

import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  ReportTemplateData,
  ReportPageFrame,
  ReportPageNumber,
  ReportTitle,
  ReportSignature,
  SectionBox,
  RingkasanOperasionalTable,
  KeuanganSummaryBoxes,
  FullSectionTable,
  getSectionTableMeta,
  tableStyle,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  A4_MARGIN_MM,
  REPORT_PDF_PAGE_ID_PREFIX,
  SectionTableMeta,
} from "@/components/laporan/ReportTemplate";
import { REPORT_SECTIONS, ReportSectionKey } from "@/lib/reportSections";

// 96dpi adalah asumsi standar CSS utk konversi satuan "mm" ke piksel di browser.
const MM_TO_PX = 96 / 25.4;
// Jarak vertikal antar blok dalam 1 halaman (samakan dg gap ReportPageFrame).
const BLOCK_GAP_PX = 16 * (96 / 96); // 16px, sesuai style gap ReportPageFrame
// Sedikit buffer aman supaya tidak mepet/overflow akibat pembulatan sub-piksel.
const SAFETY_BUFFER_PX = 6 * MM_TO_PX;

type Block =
  | { id: string; kind: "title" }
  | { id: string; kind: "sectionTitle"; sectionKey: ReportSectionKey; title: string }
  | { id: string; kind: "ringkasanTable" }
  | { id: string; kind: "keuanganBoxes" }
  | { id: string; kind: "tableRow"; sectionKey: Exclude<ReportSectionKey, "ringkasan">; render: () => React.ReactNode }
  | { id: string; kind: "signature" };

function buildBlocks(data: ReportTemplateData): Block[] {
  const blocks: Block[] = [{ id: "title", kind: "title" }];

  for (const section of REPORT_SECTIONS) {
    if (!data.sections[section.key]) continue;

    if (section.key === "ringkasan") {
      blocks.push({ id: "sec-ringkasan-title", kind: "sectionTitle", sectionKey: "ringkasan", title: "Ringkasan Operasional" });
      blocks.push({ id: "sec-ringkasan-table", kind: "ringkasanTable" });
      continue;
    }

    const key = section.key as Exclude<ReportSectionKey, "ringkasan">;
    const meta = getSectionTableMeta(key, data);
    blocks.push({ id: `sec-${key}-title`, kind: "sectionTitle", sectionKey: key, title: meta.title });

    if (key === "keuangan") {
      blocks.push({ id: "sec-keuangan-boxes", kind: "keuanganBoxes" });
    }

    if (meta.rows.length === 0) {
      // Tetap butuh 1 blok "baris kosong" supaya tabelnya tetap tampil dg pesan "belum ada data".
      blocks.push({
        id: `sec-${key}-empty`,
        kind: "tableRow",
        sectionKey: key,
        render: () => null, // ditangani khusus saat render (lihat renderPageContent)
      });
    } else {
      meta.rows.forEach((row) => {
        blocks.push({ id: `sec-${key}-row-${row.id}`, kind: "tableRow", sectionKey: key, render: () => row.content });
      });
    }
  }

  blocks.push({ id: "signature", kind: "signature" });
  return blocks;
}

// Render 1 blok (dipakai baik saat MENGUKUR tinggi maupun saat menyusun halaman final)
function renderBlockForMeasurement(block: Block, data: ReportTemplateData, metaCache: Map<string, SectionTableMeta>): React.ReactNode {
  switch (block.kind) {
    case "title":
      return <ReportTitle period={data.period} />;
    case "sectionTitle":
      return (
        <h3 style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E2E8F0", paddingBottom: 4, margin: 0 }}>
          {block.title}
        </h3>
      );
    case "ringkasanTable":
      return <RingkasanOperasionalTable summary={data.summary} />;
    case "keuanganBoxes":
      return <KeuanganSummaryBoxes financial={data.financial} />;
    case "tableRow": {
      const meta = metaCache.get(block.sectionKey) ?? getSectionTableMeta(block.sectionKey, data);
      metaCache.set(block.sectionKey, meta);
      // Bungkus 1 baris dalam tabel mini (colgroup sama persis dg tabel asli)
      // supaya lebar kolom & tinggi terukur SAMA dg tabel final berisi banyak baris.
      return (
        <table style={tableStyle}>
          <colgroup>
            {meta.colWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>{block.render() ?? <EmptyRowMeasure colSpan={meta.colSpan} />}</tbody>
        </table>
      );
    }
    case "signature":
      return <ReportSignature />;
  }
}

function EmptyRowMeasure({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ border: "1px solid #CBD5E1", padding: 16, textAlign: "center", fontStyle: "italic", color: "#94A3B8" }}>
        Belum ada data pada periode ini.
      </td>
    </tr>
  );
}

// Mengukur tinggi (px) tiap blok dg cara benar2 merender ke DOM tersembunyi,
// bukan menebak — supaya akurat apapun isi datanya (teks panjang, wrap 2 baris, dst).
function measureBlockHeights(blocks: Block[], data: ReportTemplateData): number[] {
  const contentWidthPx = (A4_WIDTH_MM - 2 * A4_MARGIN_MM) * MM_TO_PX;
  const metaCache = new Map<string, SectionTableMeta>();

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
        {blocks.map((b) => (
          <div key={b.id}>{renderBlockForMeasurement(b, data, metaCache)}</div>
        ))}
      </div>
    );
  });

  const wrapper = container.firstElementChild as HTMLElement | null;
  const heights: number[] = [];
  if (wrapper) {
    for (let i = 0; i < wrapper.children.length; i++) {
      heights.push((wrapper.children[i] as HTMLElement).offsetHeight);
    }
  }

  root.unmount();
  document.body.removeChild(container);
  return heights;
}

function paginateBlocks(blocks: Block[], heights: number[], availablePerPagePx: number): Block[][] {
  const pages: Block[][] = [[]];
  let currentHeight = 0;

  blocks.forEach((block, i) => {
    const h = heights[i] ?? 0;
    const isFirstOnPage = pages[pages.length - 1].length === 0;
    const needed = isFirstOnPage ? h : h + BLOCK_GAP_PX;

    if (!isFirstOnPage && currentHeight + needed > availablePerPagePx) {
      pages.push([]);
      currentHeight = 0;
      pages[pages.length - 1].push(block);
      currentHeight += h;
    } else {
      pages[pages.length - 1].push(block);
      currentHeight += needed;
    }
  });

  return pages;
}

// Susun ulang blok2 dalam 1 halaman jadi JSX final: baris2 tabel yg berurutan
// & 1 section yg sama otomatis digabung jadi 1 <table> dg thead segar per halaman.
function renderPageContent(pageBlocks: Block[], data: ReportTemplateData): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const metaCache = new Map<string, SectionTableMeta>();
  let i = 0;

  while (i < pageBlocks.length) {
    const block = pageBlocks[i];

    if (block.kind === "title") {
      nodes.push(<ReportTitle key={block.id} period={data.period} />);
      i++;
      continue;
    }
    if (block.kind === "sectionTitle") {
      nodes.push(
        <SectionBox key={block.id} title={block.title}>
          <></>
        </SectionBox>
      );
      i++;
      continue;
    }
    if (block.kind === "ringkasanTable") {
      nodes.push(<RingkasanOperasionalTable key={block.id} summary={data.summary} />);
      i++;
      continue;
    }
    if (block.kind === "keuanganBoxes") {
      nodes.push(<KeuanganSummaryBoxes key={block.id} financial={data.financial} />);
      i++;
      continue;
    }
    if (block.kind === "signature") {
      nodes.push(<ReportSignature key={block.id} />);
      i++;
      continue;
    }

    // kind === "tableRow": kumpulkan semua baris berurutan milik section yg sama
    // jadi SATU <table> dg thead segar (ini yg memastikan header kolom muncul
    // lagi tiap kali tabel sebuah section berlanjut ke halaman berikutnya).
    const sectionKey = block.sectionKey;
    const meta = metaCache.get(sectionKey) ?? getSectionTableMeta(sectionKey, data);
    metaCache.set(sectionKey, meta);

    const rowsInThisChunk: React.ReactNode[] = [];
    while (i < pageBlocks.length) {
      const b = pageBlocks[i];
      if (b.kind !== "tableRow" || b.sectionKey !== sectionKey) break;
      rowsInThisChunk.push(b.render() ?? <EmptyRowMeasure key={b.id} colSpan={meta.colSpan} />);
      i++;
    }

    nodes.push(
      <table key={`table-${sectionKey}-${i}`} style={tableStyle}>
        <colgroup>
          {meta.colWidths.map((w, ci) => (
            <col key={ci} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>{meta.thead}</thead>
        <tbody>{rowsInThisChunk}</tbody>
      </table>
    );
  }

  return nodes;
}

export interface PaginatedReport {
  pageIds: string[];
  cleanup: () => void;
}

// ============================================================
// FUNGSI UTAMA: bangun N halaman A4 (masing2 ber-header) ke DOM tersembunyi,
// kembalikan daftar id DOM-nya supaya reportExport.ts tinggal html2canvas
// satu-satu lalu susun ke jsPDF. Panggil `cleanup()` setelah selesai export.
// ============================================================
export async function buildPaginatedReportDOM(data: ReportTemplateData): Promise<PaginatedReport> {
  const blocks = buildBlocks(data);
  const heights = measureBlockHeights(blocks, data);

  // Tinggi header (kop surat) diukur juga secara nyata (bukan ditebak) supaya
  // sisa ruang per halaman akurat, karena tinggi header sedikit bervariasi
  // tergantung apakah logo/font sudah termuat saat pengukuran.
  const headerHeightPx = measureHeaderHeight();

  const pageContentAvailablePx =
    (A4_HEIGHT_MM - 2 * A4_MARGIN_MM) * MM_TO_PX - headerHeightPx - BLOCK_GAP_PX - SAFETY_BUFFER_PX;

  const pages = paginateBlocks(blocks, heights, pageContentAvailablePx);
  const totalPages = pages.length;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const root = createRoot(container);
  const pageIds = pages.map((_, idx) => `${REPORT_PDF_PAGE_ID_PREFIX}${idx}`);

  flushSync(() => {
    root.render(
      <div>
        {pages.map((pageBlocks, idx) => (
          <ReportPageFrame key={pageIds[idx]} id={pageIds[idx]} fixedHeight footer={<ReportPageNumber page={idx + 1} totalPages={totalPages} />}>
            {renderPageContent(pageBlocks, data)}
          </ReportPageFrame>
        ))}
      </div>
    );
  });

  return {
    pageIds,
    cleanup: () => {
      root.unmount();
      document.body.removeChild(container);
    },
  };
}

function measureHeaderHeight(): number {
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
  let height = 0;
  flushSync(() => {
    root.render(
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        ref={(node) => {
          if (node) height = node.offsetHeight;
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 34, width: 60 }} />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>INU Asset</span>
            <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>PT ITDC Nusantara Utilitas</span>
          </div>
        </div>
        <div style={{ borderTop: "1.5pt solid #000000" }} />
      </div>
    );
  });

  root.unmount();
  document.body.removeChild(container);
  return height;
}