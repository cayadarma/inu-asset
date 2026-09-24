// lib/reportQueries.ts
//
// Kumpulan fungsi query Supabase khusus untuk Laporan Operasional.
// Semua fungsi menerima ResolvedPeriod ({ startDate, endDate }) dari lib/reportPeriod.ts
// sehingga tidak perlu tahu mode periode apa yang dipilih user (Harian/Mingguan/dst).
//
// Skema tabel yang dipakai di sini SUDAH diverifikasi dari kode existing:
// - work_orders            (app/pemeliharaan/korektif/*)
// - maintenance_schedules  (app/pemeliharaan/page.tsx, checklist/[id])
// - damage_reports         (app/buku-sakit/*)
// - asset_status_snapshots (app/page.tsx)

import { supabase } from "@/lib/supabase";
import { ResolvedPeriod } from "@/lib/reportPeriod";

// --- Ambil SEMUA baris dari sebuah query, walau jumlahnya lebih dari batas default
// Supabase/PostgREST (1000 baris per request). Tanpa ini, query dengan rentang tanggal
// panjang (mis. Tahunan) akan diam-diam terpotong di baris ke-1000 -- yang paling sering
// kena adalah data TERBARU (karena diurutkan ascending), sehingga grafik/laporan terlihat
// "anjlok ke 0" padahal datanya sebenarnya ada di database.
// `queryFactory` menerima (from, to) dan HARUS memanggil .range(from, to) di ujungnya.
async function fetchAllPages<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFactory(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break; // halaman terakhir
    from += PAGE_SIZE;
  }

  return allRows;
}

// --- Batas waktu inklusif untuk kolom timestamp (created_at, completed_at, dll) ---
// Kolom-kolom ini bertipe timestamp, sedangkan startDate/endDate cuma tanggal (YYYY-MM-DD),
// jadi endDate perlu digenapkan ke akhir hari supaya data di hari terakhir ikut terhitung.
function toRangeBounds(period: ResolvedPeriod) {
  return {
    fromTs: `${period.startDate}T00:00:00`,
    toTs: `${period.endDate}T23:59:59`,
  };
}

export interface OperationalSummary {
  availabilityAvgPct: number | null; // null jika tidak ada snapshot pada rentang ini
  availabilitySnapshotDays: number;  // jumlah hari yang benar-benar terdata (bukan seluruh hari di rentang)
  totalWorkOrder: number;
  totalWorkOrderSelesai: number;
  mttrHours: number | null; // null jika belum ada WO selesai pada rentang ini
  pmTotalJadwal: number;
  pmSelesai: number;
  pmCompletionRatePct: number; // 0 jika pmTotalJadwal = 0
  totalBukuSakit: number;
}

// --- 1 & --- Availability rata-rata dari asset_status_snapshots ---
async function fetchAvailability(period: ResolvedPeriod) {
  interface SnapshotRow {
    snapshot_date: string;
    location_id: string | null;
    beroperasi: number;
    idle: number;
    pemeliharaan: number;
    perbaikan: number;
    rusak: number;
    total: number;
  }

  const data = await fetchAllPages<SnapshotRow>((from, to) =>
    supabase
      .from("asset_status_snapshots")
      .select("snapshot_date, location_id, beroperasi, idle, pemeliharaan, perbaikan, rusak, total")
      .gte("snapshot_date", period.startDate)
      .lte("snapshot_date", period.endDate)
      .range(from, to)
  );

  if (data.length === 0) {
    return { availabilityAvgPct: null, availabilitySnapshotDays: 0 };
  }

  // --- Jumlahkan dulu semua baris per-lokasi jadi satu total per tanggal, BARU hitung
  // persentase harian. Kalau tidak, satu hari dengan 5 baris lokasi akan dihitung sebagai
  // 5 "hari" terpisah saat dirata-rata -- salah secara matematis (lihat juga
  // fetchAvailabilityTrend di bawah, yang punya pola agregasi sama).
  type Totals = { beroperasi: number; idle: number; pemeliharaan: number; total: number };
  const perDate = new Map<string, { sum: Totals; hasLocationRows: boolean; fallback?: Totals }>();

  data.forEach((row) => {
    const entry = perDate.get(row.snapshot_date) || { sum: { beroperasi: 0, idle: 0, pemeliharaan: 0, total: 0 }, hasLocationRows: false, fallback: undefined };
    const rowTotals: Totals = { beroperasi: row.beroperasi, idle: row.idle, pemeliharaan: row.pemeliharaan, total: row.total };

    if (row.location_id) {
      entry.hasLocationRows = true;
      entry.sum = {
        beroperasi: entry.sum.beroperasi + rowTotals.beroperasi,
        idle: entry.sum.idle + rowTotals.idle,
        pemeliharaan: entry.sum.pemeliharaan + rowTotals.pemeliharaan,
        total: entry.sum.total + rowTotals.total,
      };
    } else {
      entry.fallback = rowTotals;
    }

    perDate.set(row.snapshot_date, entry);
  });

  // Availability per hari: sama seperti rumus di app/page.tsx
  // (Beroperasi + Idle + Pemeliharaan) dianggap "tersedia"; Perbaikan & Rusak tidak.
  const dailyPct: number[] = [];
  perDate.forEach((entry) => {
    const t = entry.hasLocationRows ? entry.sum : entry.fallback;
    if (t && t.total > 0) {
      dailyPct.push(((t.beroperasi + t.idle + t.pemeliharaan) / t.total) * 100);
    }
  });

  if (dailyPct.length === 0) {
    return { availabilityAvgPct: null, availabilitySnapshotDays: 0 };
  }

  const avg = dailyPct.reduce((sum, v) => sum + v, 0) / dailyPct.length;
  return { availabilityAvgPct: avg, availabilitySnapshotDays: dailyPct.length };
}

// --- 2 & 3 & 4: Total WO, WO selesai, MTTR dari work_orders ---
async function fetchWorkOrderStats(period: ResolvedPeriod) {
  const { fromTs, toTs } = toRangeBounds(period);

  // Total WO dibuat pada rentang periode (berdasarkan created_at, sesuai pola created_at di WO detail)
  const { count: totalWorkOrder } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", fromTs)
    .lte("created_at", toTs);

  // WO yang SELESAI pada rentang periode (berdasarkan completed_at, bukan created_at,
  // supaya WO yang dibuat bulan lalu tapi selesai bulan ini tetap terhitung "selesai" di periode ini)
  const { data: selesaiRows } = await supabase
    .from("work_orders")
    .select("id, created_at, completed_at")
    .eq("status", "Selesai")
    .gte("completed_at", fromTs)
    .lte("completed_at", toTs);

  const totalWorkOrderSelesai = selesaiRows?.length || 0;

  // MTTR = rata-rata (completed_at - created_at) dalam jam, dari WO yang selesai pada rentang ini
  let mttrHours: number | null = null;
  if (selesaiRows && selesaiRows.length > 0) {
    const durationsMs = selesaiRows
      .filter((wo) => wo.completed_at && wo.created_at)
      .map((wo) => new Date(wo.completed_at as string).getTime() - new Date(wo.created_at as string).getTime())
      .filter((ms) => ms >= 0); // jaga-jaga kalau ada data tidak konsisten

    if (durationsMs.length > 0) {
      const avgMs = durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length;
      mttrHours = avgMs / (1000 * 60 * 60);
    }
  }

  return {
    totalWorkOrder: totalWorkOrder || 0,
    totalWorkOrderSelesai,
    mttrHours,
  };
}

// --- 5: PM completion rate dari maintenance_schedules ---
async function fetchPreventiveStats(period: ResolvedPeriod) {
  const { data } = await supabase
    .from("maintenance_schedules")
    .select("id, status")
    .gte("scheduled_date", period.startDate)
    .lte("scheduled_date", period.endDate);

  const pmTotalJadwal = data?.length || 0;
  const pmSelesai = data?.filter((s) => s.status === "Selesai").length || 0;
  const pmCompletionRatePct = pmTotalJadwal > 0 ? (pmSelesai / pmTotalJadwal) * 100 : 0;

  return { pmTotalJadwal, pmSelesai, pmCompletionRatePct };
}

// --- 6: Total entri Buku Sakit dari damage_reports ---
async function fetchBukuSakitCount(period: ResolvedPeriod) {
  const { fromTs, toTs } = toRangeBounds(period);
  const { count } = await supabase
    .from("damage_reports")
    .select("id", { count: "exact", head: true })
    .gte("created_at", fromTs)
    .lte("created_at", toTs);

  return count || 0;
}

// --- Data tren availability harian (untuk grafik) dari asset_status_snapshots ---
export interface AvailabilityTrendPoint {
  date: string; // YYYY-MM-DD
  beroperasi: number;
  idle: number;
  pemeliharaan: number;
  perbaikan: number;
  rusak: number;
  total: number;
  availabilityPct: number;
}

export async function fetchAvailabilityTrend(period: ResolvedPeriod): Promise<AvailabilityTrendPoint[]> {
  // NB: asset_status_snapshots bisa punya LEBIH DARI 1 baris per snapshot_date
  // (satu baris per location_id, sama seperti di components/ui/AvailabilityChart.tsx).
  // Query di bawah ini WAJIB menjumlahkan seluruh baris per tanggal sebelum dipakai
  // sebagai 1 titik grafik -- kalau tidak, tanggal yang sama akan muncul berkali-kali
  // (satu titik per lokasi) dan grafik jadi bergerigi/zig-zag, bukan satu garis mulus
  // per hari seperti di Dashboard.
  interface TrendRow {
    snapshot_date: string;
    location_id: string | null;
    beroperasi: number;
    idle: number;
    pemeliharaan: number;
    perbaikan: number;
    rusak: number;
    total: number;
  }

  // NB: pakai fetchAllPages, BUKAN supabase.from(...).select(...) langsung -- rentang
  // Tahunan/Custom yang panjang bisa melebihi batas default 1000 baris per request dari
  // Supabase/PostgREST, dan karena datanya diurutkan ascending, yang kepotong diam-diam
  // adalah tanggal-tanggal PALING BARU (persis gejala "grafik anjlok ke 0 di bulan-bulan
  // belakangan" yang sebelumnya terjadi di Dashboard).
  const data = await fetchAllPages<TrendRow>((from, to) =>
    supabase
      .from("asset_status_snapshots")
      .select("snapshot_date, location_id, beroperasi, idle, pemeliharaan, perbaikan, rusak, total")
      .gte("snapshot_date", period.startDate)
      .lte("snapshot_date", period.endDate)
      .order("snapshot_date", { ascending: true })
      .range(from, to)
  );

  if (data.length === 0) return [];

  type Totals = { beroperasi: number; idle: number; pemeliharaan: number; perbaikan: number; rusak: number; total: number };
  const EMPTY_TOTALS: Totals = { beroperasi: 0, idle: 0, pemeliharaan: 0, perbaikan: 0, rusak: 0, total: 0 };

  // --- Jumlahkan baris berlokasi (location_id NOT NULL) per tanggal.
  // Fallback ke baris location_id NULL kalau tanggal itu belum punya breakdown per lokasi
  // sama sekali (histori lama sebelum backfill per lokasi) -- persis pola di AvailabilityChart.tsx.
  const perDate = new Map<string, { sum: Totals; hasLocationRows: boolean; fallback?: Totals }>();

  data.forEach((row) => {
    const entry = perDate.get(row.snapshot_date) || { sum: { ...EMPTY_TOTALS }, hasLocationRows: false, fallback: undefined };
    const rowTotals: Totals = {
      beroperasi: row.beroperasi,
      idle: row.idle,
      pemeliharaan: row.pemeliharaan,
      perbaikan: row.perbaikan,
      rusak: row.rusak,
      total: row.total,
    };

    if (row.location_id) {
      entry.hasLocationRows = true;
      entry.sum = {
        beroperasi: entry.sum.beroperasi + rowTotals.beroperasi,
        idle: entry.sum.idle + rowTotals.idle,
        pemeliharaan: entry.sum.pemeliharaan + rowTotals.pemeliharaan,
        perbaikan: entry.sum.perbaikan + rowTotals.perbaikan,
        rusak: entry.sum.rusak + rowTotals.rusak,
        total: entry.sum.total + rowTotals.total,
      };
    } else {
      entry.fallback = rowTotals;
    }

    perDate.set(row.snapshot_date, entry);
  });

  const datesSorted = Array.from(perDate.keys()).sort();

  return datesSorted.map((date) => {
    const entry = perDate.get(date)!;
    const t = entry.hasLocationRows ? entry.sum : (entry.fallback || EMPTY_TOTALS);
    return {
      date,
      beroperasi: t.beroperasi,
      idle: t.idle,
      pemeliharaan: t.pemeliharaan,
      perbaikan: t.perbaikan,
      rusak: t.rusak,
      total: t.total,
      availabilityPct: t.total > 0 ? ((t.beroperasi + t.idle + t.pemeliharaan) / t.total) * 100 : 0,
    };
  });
}

// ============================================================
// SECTION: CORRECTIVE MAINTENANCE (+ MTTR breakdown)
// ============================================================

export interface CorrectiveWorkOrderRow {
  id: string;
  tgl: string | null;
  assetId: string;
  assetName: string;
  locationName: string;
  trouble: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  actualCost: number | null;
  // --- Ditambahkan utk kebutuhan export Excel WO (format perusahaan) ---
  // Diambil dari damage_reports (form "Laporkan Kerusakan Aset"), BUKAN dari
  // work_orders.trouble/tindak_lanjut — sesuai keputusan: form WO saat ini
  // masih akan direvisi, jadi sumber utama tetap Buku Sakit.
  masalah: string | null; // damage_reports.issue_title ("Judul Masalah")
  indikasiPenyebab: string | null; // damage_reports.description ("Kronologi")
  pelaksana: string | null; // work_orders.tech_name
  pengawas: string | null; // work_orders.supervisor
  ket: string | null; // work_orders.tindak_lanjut
  fotoUrl: string | null; // foto TERBARU dari work_order_updates.proof_photo_url
}

export interface LocationBreakdownRow {
  locationName: string;
  total: number;
  selesai: number;
  mttrHours: number | null;
}

export interface TopDamagedAssetRow {
  assetId: string;
  assetName: string;
  locationName: string;
  jumlahLaporan: number;
}

export interface CorrectiveMaintenanceReport {
  totalWO: number;
  byStatus: { selesai: number; proses: number; pending: number };
  mttrHours: number | null;
  byLocation: LocationBreakdownRow[];
  topDamagedAssets: TopDamagedAssetRow[];
  detailRows: CorrectiveWorkOrderRow[];
}

// Pemetaan status mentah work_orders -> 3 kategori ringkas yang diminta:
// Selesai -> "selesai", Dalam Proses -> "proses", Menunggu Part -> "pending"
function mapStatusToCategory(status: string): "selesai" | "proses" | "pending" {
  if (status === "Selesai") return "selesai";
  if (status === "Menunggu Part") return "pending";
  return "proses"; // default: "Dalam Proses" dan status lain yang belum selesai/menunggu part
}

function calcMttrHours(rows: { created_at: string; completed_at: string | null }[]): number | null {
  const durationsMs = rows
    .filter((r) => r.completed_at)
    .map((r) => new Date(r.completed_at as string).getTime() - new Date(r.created_at).getTime())
    .filter((ms) => ms >= 0);
  if (durationsMs.length === 0) return null;
  return durationsMs.reduce((s, ms) => s + ms, 0) / durationsMs.length / (1000 * 60 * 60);
}

export async function fetchCorrectiveMaintenanceReport(period: ResolvedPeriod): Promise<CorrectiveMaintenanceReport> {
  const { fromTs, toTs } = toRangeBounds(period);

  // WO yang DIBUAT pada rentang periode ini (cakupan section = aktivitas korektif periode berjalan)
  const { data: woData } = await supabase
    .from("work_orders")
    .select("id, tgl, asset_id, damage_report_id, trouble, tech_name, supervisor, tindak_lanjut, status, actual_cost, created_at, completed_at, assets(name, locations(name))")
    .gte("created_at", fromTs)
    .lte("created_at", toTs)
    .order("created_at", { ascending: false });

  const rows = woData || [];

  const totalWO = rows.length;
  const byStatus = { selesai: 0, proses: 0, pending: 0 };
  rows.forEach((wo: any) => {
    byStatus[mapStatusToCategory(wo.status)]++;
  });

  const mttrHours = calcMttrHours(
    rows.filter((wo: any) => wo.status === "Selesai").map((wo: any) => ({ created_at: wo.created_at, completed_at: wo.completed_at }))
  );

  // --- Breakdown per lokasi ---
  const locationMap = new Map<string, { total: number; selesai: number; rows: { created_at: string; completed_at: string | null }[] }>();
  rows.forEach((wo: any) => {
    const locName = wo.assets?.locations?.name || "Tanpa Lokasi";
    const entry = locationMap.get(locName) || { total: 0, selesai: 0, rows: [] };
    entry.total += 1;
    if (wo.status === "Selesai") {
      entry.selesai += 1;
      entry.rows.push({ created_at: wo.created_at, completed_at: wo.completed_at });
    }
    locationMap.set(locName, entry);
  });
  const byLocation: LocationBreakdownRow[] = Array.from(locationMap.entries())
    .map(([locationName, v]) => ({
      locationName,
      total: v.total,
      selesai: v.selesai,
      mttrHours: calcMttrHours(v.rows),
    }))
    .sort((a, b) => b.total - a.total);

  // --- Aset dengan laporan kerusakan (Buku Sakit) terbanyak, pada rentang periode yang sama ---
  const { data: damageData } = await supabase
    .from("damage_reports")
    .select("asset_id, created_at, assets(name, locations(name))")
    .gte("created_at", fromTs)
    .lte("created_at", toTs);

  const damageMap = new Map<string, { assetName: string; locationName: string; count: number }>();
  (damageData || []).forEach((d: any) => {
    const key = d.asset_id;
    const entry = damageMap.get(key) || {
      assetName: d.assets?.name || key,
      locationName: d.assets?.locations?.name || "-",
      count: 0,
    };
    entry.count += 1;
    damageMap.set(key, entry);
  });
  const topDamagedAssets: TopDamagedAssetRow[] = Array.from(damageMap.entries())
    .map(([assetId, v]) => ({ assetId, assetName: v.assetName, locationName: v.locationName, jumlahLaporan: v.count }))
    .sort((a, b) => b.jumlahLaporan - a.jumlahLaporan)
    .slice(0, 10);

  // --- Tabel detail WO ---
  // Sumber "Masalah" & "Indikasi Penyebab" = Buku Sakit (damage_reports), bukan
  // field work_orders — per keputusan ayaa (form WO masih akan direvisi).
  //
  // Sejak work_orders punya kolom damage_report_id (FK langsung ke damage_reports),
  // pencocokan WO <-> laporan kerusakan dilakukan lewat FK ini — akurat 100%, tidak lagi
  // menebak berdasarkan kedekatan waktu. Heuristik waktu di bawah HANYA dipakai sebagai
  // fallback untuk WO lama yang dibuat sebelum kolom damage_report_id ada (nilainya null).
  const woIds = rows.map((wo: any) => wo.id);
  const directReportIds = Array.from(
    new Set(rows.map((wo: any) => wo.damage_report_id).filter((v: any): v is string => !!v))
  );
  const assetIdsForFallback = Array.from(
    new Set(rows.filter((wo: any) => !wo.damage_report_id).map((wo: any) => wo.asset_id))
  );

  const { data: directDamageReports } = directReportIds.length
    ? await supabase
        .from("damage_reports")
        .select("id, issue_title, description")
        .in("id", directReportIds)
    : { data: [] as any[] };
  const damageReportById = new Map<string, { issue_title: string | null; description: string | null }>();
  (directDamageReports || []).forEach((d: any) => damageReportById.set(d.id, d));

  const { data: fallbackDamageReports } = assetIdsForFallback.length
    ? await supabase
        .from("damage_reports")
        .select("asset_id, issue_title, description, created_at")
        .in("asset_id", assetIdsForFallback)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  const { data: relatedUpdates } = woIds.length
    ? await supabase
        .from("work_order_updates")
        .select("work_order_id, proof_photo_url, created_at")
        .in("work_order_id", woIds)
        .not("proof_photo_url", "is", null)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  // Ambil foto TERBARU per WO (data sudah diurutkan desc, jadi first-match menang)
  const latestPhotoByWoId = new Map<string, string>();
  (relatedUpdates || []).forEach((u: any) => {
    if (!latestPhotoByWoId.has(u.work_order_id)) {
      latestPhotoByWoId.set(u.work_order_id, u.proof_photo_url);
    }
  });

  const TOLERANSI_MS = 30 * 60 * 1000; // 30 menit toleransi laporan dibuat sedikit setelah WO (alur emergency, khusus fallback)

  const detailRows: CorrectiveWorkOrderRow[] = rows.map((wo: any) => {
    let matched: { issue_title: string | null; description: string | null } | null | undefined =
      wo.damage_report_id ? damageReportById.get(wo.damage_report_id) : null;

    // Fallback heuristik waktu — hanya jalan untuk WO lama tanpa damage_report_id
    if (!matched && !wo.damage_report_id) {
      const woCreatedMs = new Date(wo.created_at).getTime();
      matched = (fallbackDamageReports || [])
        .filter((d: any) => d.asset_id === wo.asset_id)
        .find((d: any) => new Date(d.created_at).getTime() <= woCreatedMs + TOLERANSI_MS);
    }

    return {
      id: wo.id,
      tgl: wo.tgl,
      assetId: wo.asset_id,
      assetName: wo.assets?.name || wo.asset_id,
      locationName: wo.assets?.locations?.name || "-",
      trouble: wo.trouble,
      status: wo.status,
      createdAt: wo.created_at,
      completedAt: wo.completed_at,
      actualCost: wo.actual_cost,
      masalah: matched?.issue_title ?? wo.trouble ?? null,
      indikasiPenyebab: matched?.description ?? null,
      pelaksana: wo.tech_name ?? null,
      pengawas: wo.supervisor ?? null,
      ket: wo.tindak_lanjut ?? null,
      fotoUrl: latestPhotoByWoId.get(wo.id) ?? null,
    };
  });

  return { totalWO, byStatus, mttrHours, byLocation, topDamagedAssets, detailRows };
}

// ============================================================
// SECTION: PREVENTIVE MAINTENANCE
// ============================================================

export type PmDisplayStatus = "Terjadwal" | "Berlangsung" | "Selesai" | "Terlambat";

// --- SAMA PERSIS dengan getDisplayStatus() di app/pemeliharaan/page.tsx ---
// Terlambat = status belum Selesai/Berlangsung DAN scheduled_date sudah lewat hari ini.
function getPmDisplayStatus(status: string, scheduledDate: string): PmDisplayStatus {
  if (status === "Selesai" || status === "Berlangsung") return status;
  const scheduled = new Date(scheduledDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (scheduled < now) return "Terlambat";
  return "Terjadwal";
}

export interface PmScheduleRow {
  id: string;
  scheduledDate: string;
  assetId: string;
  assetName: string;
  locationName: string;
  operatorName: string | null;
  displayStatus: PmDisplayStatus;
}

export interface PmLocationBreakdownRow {
  locationName: string;
  total: number;
  selesai: number;
  terlambat: number;
}

export interface PreventiveMaintenanceReport {
  totalJadwal: number;
  selesai: number;
  terlambat: number;
  terjadwal: number;
  berlangsung: number;
  completionRatePct: number;
  byLocation: PmLocationBreakdownRow[];
  detailRows: PmScheduleRow[];
}

export async function fetchPreventiveMaintenanceReport(period: ResolvedPeriod): Promise<PreventiveMaintenanceReport> {
  const { data } = await supabase
    .from("maintenance_schedules")
    .select("id, scheduled_date, status, operator_name, asset_id, assets(name, locations(name))")
    .gte("scheduled_date", period.startDate)
    .lte("scheduled_date", period.endDate)
    .order("scheduled_date", { ascending: false });

  const rows = (data || []).map((s: any) => ({
    id: s.id,
    scheduledDate: s.scheduled_date,
    assetId: s.asset_id,
    assetName: s.assets?.name || s.asset_id,
    locationName: s.assets?.locations?.name || "Tanpa Lokasi",
    operatorName: s.operator_name,
    displayStatus: getPmDisplayStatus(s.status, s.scheduled_date),
  })) as PmScheduleRow[];

  const totalJadwal = rows.length;
  const selesai = rows.filter((r) => r.displayStatus === "Selesai").length;
  const terlambat = rows.filter((r) => r.displayStatus === "Terlambat").length;
  const terjadwal = rows.filter((r) => r.displayStatus === "Terjadwal").length;
  const berlangsung = rows.filter((r) => r.displayStatus === "Berlangsung").length;
  const completionRatePct = totalJadwal > 0 ? (selesai / totalJadwal) * 100 : 0;

  const locationMap = new Map<string, { total: number; selesai: number; terlambat: number }>();
  rows.forEach((r) => {
    const entry = locationMap.get(r.locationName) || { total: 0, selesai: 0, terlambat: 0 };
    entry.total += 1;
    if (r.displayStatus === "Selesai") entry.selesai += 1;
    if (r.displayStatus === "Terlambat") entry.terlambat += 1;
    locationMap.set(r.locationName, entry);
  });
  const byLocation: PmLocationBreakdownRow[] = Array.from(locationMap.entries())
    .map(([locationName, v]) => ({ locationName, ...v }))
    .sort((a, b) => b.total - a.total);

  return { totalJadwal, selesai, terlambat, terjadwal, berlangsung, completionRatePct, byLocation, detailRows: rows };
}

// ============================================================
// SECTION: BUKU SAKIT / HISTORI STATUS ASET
// ============================================================

export interface BukuSakitRow {
  id: string;
  assetId: string;
  assetName: string;
  locationName: string;
  issueTitle: string | null;
  urgency: string | null;
  createdAt: string;
  estimatedDurationHours: number | null; // null = belum ketemu WO penyelesaiannya (masih terbuka / tidak match)
}

export interface ProblematicAssetRow {
  assetId: string;
  assetName: string;
  locationName: string;
  frekuensi: number;
}

export interface BukuSakitReport {
  totalEntri: number;
  topProblematicAssets: ProblematicAssetRow[];
  detailRows: BukuSakitRow[];
}

// Toleransi pencarian WO pasangan: WO harus dibuat PADA/SETELAH damage report,
// dan tidak lebih dari 3 hari sesudahnya (mengikuti alur "Perbaikan Mendadak" yang
// membuat damage_reports & work_orders nyaris bersamaan). Di luar itu, dianggap tidak match.
const WO_MATCH_TOLERANCE_MS = 3 * 24 * 60 * 60 * 1000;

export async function fetchBukuSakitReport(period: ResolvedPeriod): Promise<BukuSakitReport> {
  const { fromTs, toTs } = toRangeBounds(period);

  const { data: damageData } = await supabase
    .from("damage_reports")
    .select("id, asset_id, issue_title, urgency, created_at, assets(name, locations(name))")
    .gte("created_at", fromTs)
    .lte("created_at", toTs)
    .order("created_at", { ascending: false });

  const rows = damageData || [];
  const totalEntri = rows.length;

  // --- Ambil semua WO untuk aset-aset yang muncul di rows, buat pencarian pasangan WO nya ---
  const assetIds = Array.from(new Set(rows.map((r: any) => r.asset_id)));
  let workOrdersByAsset = new Map<string, { created_at: string; completed_at: string | null }[]>();
  let workOrderByReportId = new Map<string, { completed_at: string | null }>();

  if (assetIds.length > 0) {
    const { data: woData } = await supabase
      .from("work_orders")
      .select("asset_id, damage_report_id, created_at, completed_at")
      .in("asset_id", assetIds)
      .order("created_at", { ascending: true });

    (woData || []).forEach((wo: any) => {
      // Pencocokan utama: lewat FK damage_report_id (akurat, tidak menebak)
      if (wo.damage_report_id) {
        workOrderByReportId.set(wo.damage_report_id, { completed_at: wo.completed_at });
      }
      // Tetap kumpulkan per aset untuk fallback heuristik waktu (WO lama tanpa FK ini)
      const list = workOrdersByAsset.get(wo.asset_id) || [];
      list.push({ created_at: wo.created_at, completed_at: wo.completed_at });
      workOrdersByAsset.set(wo.asset_id, list);
    });
  }

  const detailRows: BukuSakitRow[] = rows.map((r: any) => {
    // Pencocokan utama: WO yang benar-benar diterbitkan dari laporan ini (via FK)
    const directMatch = workOrderByReportId.get(r.id);

    let estimatedDurationHours: number | null = null;

    if (directMatch) {
      if (directMatch.completed_at) {
        const reportTime = new Date(r.created_at).getTime();
        const completedTime = new Date(directMatch.completed_at).getTime();
        estimatedDurationHours = (completedTime - reportTime) / (1000 * 60 * 60);
      }
      // Kalau directMatch ada tapi belum completed_at, berarti WO-nya masih berjalan -> tetap null (belum selesai)
    } else {
      // Fallback heuristik waktu — hanya relevan untuk laporan lama yang WO-nya
      // dibuat sebelum kolom damage_report_id ada, sehingga tidak punya pasangan FK.
      const reportTime = new Date(r.created_at).getTime();
      const candidates = workOrdersByAsset.get(r.asset_id) || [];

      let bestMatch: { created_at: string; completed_at: string | null } | null = null;
      let bestDiff = Infinity;
      candidates.forEach((wo) => {
        const woTime = new Date(wo.created_at).getTime();
        const diff = woTime - reportTime;
        if (diff >= 0 && diff <= WO_MATCH_TOLERANCE_MS && diff < bestDiff) {
          bestDiff = diff;
          bestMatch = wo;
        }
      });

      if (bestMatch && (bestMatch as any).completed_at) {
        const completedTime = new Date((bestMatch as any).completed_at as string).getTime();
        estimatedDurationHours = (completedTime - reportTime) / (1000 * 60 * 60);
      }
    }

    return {
      id: r.id,
      assetId: r.asset_id,
      assetName: r.assets?.name || r.asset_id,
      locationName: r.assets?.locations?.name || "-",
      issueTitle: r.issue_title,
      urgency: r.urgency,
      createdAt: r.created_at,
      estimatedDurationHours,
    };
  });

  // --- Frekuensi / aset paling bermasalah ---
  const freqMap = new Map<string, { assetName: string; locationName: string; count: number }>();
  rows.forEach((r: any) => {
    const entry = freqMap.get(r.asset_id) || {
      assetName: r.assets?.name || r.asset_id,
      locationName: r.assets?.locations?.name || "-",
      count: 0,
    };
    entry.count += 1;
    freqMap.set(r.asset_id, entry);
  });
  const topProblematicAssets: ProblematicAssetRow[] = Array.from(freqMap.entries())
    .map(([assetId, v]) => ({ assetId, assetName: v.assetName, locationName: v.locationName, frekuensi: v.count }))
    .sort((a, b) => b.frekuensi - a.frekuensi)
    .slice(0, 10);

  return { totalEntri, topProblematicAssets, detailRows };
}

// --- Fungsi utama: jalankan semua query di atas secara paralel ---
export async function fetchOperationalSummary(period: ResolvedPeriod): Promise<OperationalSummary> {
  const [availability, woStats, pmStats, bukuSakitCount] = await Promise.all([
    fetchAvailability(period),
    fetchWorkOrderStats(period),
    fetchPreventiveStats(period),
    fetchBukuSakitCount(period),
  ]);

  return {
    availabilityAvgPct: availability.availabilityAvgPct,
    availabilitySnapshotDays: availability.availabilitySnapshotDays,
    totalWorkOrder: woStats.totalWorkOrder,
    totalWorkOrderSelesai: woStats.totalWorkOrderSelesai,
    mttrHours: woStats.mttrHours,
    pmTotalJadwal: pmStats.pmTotalJadwal,
    pmSelesai: pmStats.pmSelesai,
    pmCompletionRatePct: pmStats.pmCompletionRatePct,
    totalBukuSakit: bukuSakitCount,
  };
}

// --- Helper format: jam desimal -> "2 hari 6 jam" / "5 jam" ---
export function formatDurationHours(hours: number | null): string {
  if (hours === null || isNaN(hours)) return "-";
  const totalHours = Math.round(hours);
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  if (days > 0) return `${days} hari ${remHours} jam`;
  return `${remHours} jam`;
}