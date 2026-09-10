// lib/costQueries.ts
//
// Logic pengambilan data biaya (4 kategori) — DIEKSTRAK dari app/analisis-biaya/page.tsx
// supaya bisa dipakai bersama oleh halaman Analisis Biaya MAUPUN Laporan Keuangan/Manajemen,
// tanpa duplikasi query. Skema tabel & rumus perhitungan SAMA PERSIS dengan versi asli
// di app/analisis-biaya/page.tsx — jangan ubah rumusnya di sini tanpa mengubah juga di sana,
// atau sebaliknya cukup ubah di sini karena analisis-biaya sekarang memanggil fungsi ini.

import { supabase } from "@/lib/supabase";

export type CostCategory = "Perbaikan" | "Pembelian Stok" | "Pemeliharaan" | "Pembelian Aset";

export const COST_CATEGORIES: CostCategory[] = ["Pemeliharaan", "Perbaikan", "Pembelian Stok", "Pembelian Aset"];

export interface CostTransaction {
  id: string;
  date: string; // ISO date dipakai untuk sorting & grouping bulan
  category: CostCategory;
  description: string;
  location: string | null;
  amount: number;
  href: string;
}

// --- Ambil SELURUH transaksi biaya dari 4 sumber (Perbaikan, Stok, Pemeliharaan, Aset) ---
// Tidak difilter tanggal di level query (sama seperti perilaku asli analisis-biaya),
// filter periode dilakukan di pemanggil (client-side) supaya YoY & tren tahunan tetap bisa
// menghitung dari seluruh histori data.
export async function fetchAllCostTransactions(): Promise<CostTransaction[]> {
  // 1. BIAYA PERBAIKAN (dari Work Order Korektif yang sudah ada biaya aktual)
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, asset_id, actual_cost, completed_at, created_at, assets(name, locations(name))")
    .gt("actual_cost", 0);

  const perbaikanTx: CostTransaction[] = (workOrders || []).map((wo: any) => ({
    id: `wo-${wo.id}`,
    date: wo.completed_at || wo.created_at,
    category: "Perbaikan",
    description: `${wo.asset_id}${wo.assets?.name ? ` — ${wo.assets.name}` : ""}`,
    location: wo.assets?.locations?.name || null,
    amount: wo.actual_cost || 0,
    href: `/pemeliharaan/korektif/${wo.id}`,
  }));

  // 2. BIAYA PEMBELIAN STOK
  const { data: stockItems } = await supabase
    .from("stock_items")
    .select("id, name, qty, purchase_price, created_at");

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("id, stock_item_id, type, qty, unit_price, created_at, reference, stock_items(name)")
    .eq("type", "Masuk")
    .not("unit_price", "is", null);

  const { data: allMovementsForQty } = await supabase
    .from("stock_movements")
    .select("stock_item_id, type, qty");

  const netQtyByItem = new Map<string, number>();
  (allMovementsForQty || []).forEach((m: any) => {
    const delta = m.type === "Masuk" ? m.qty : -m.qty;
    netQtyByItem.set(m.stock_item_id, (netQtyByItem.get(m.stock_item_id) || 0) + delta);
  });

  const initialStokTx: CostTransaction[] = (stockItems || [])
    .map((item: any): CostTransaction | null => {
      const initialQty = item.qty - (netQtyByItem.get(item.id) || 0);
      const initialValue = (item.purchase_price || 0) * initialQty;
      if (initialValue <= 0) return null;
      return {
        id: `stok-awal-${item.id}`,
        date: item.created_at,
        category: "Pembelian Stok" as const,
        description: `${item.name} (Stok Awal — ${initialQty} unit)`,
        location: null,
        amount: initialValue,
        href: `/stok/${item.id}`,
      };
    })
    .filter((tx): tx is CostTransaction => tx !== null);

  const stokTx: CostTransaction[] = (movements || []).map((m: any) => ({
    id: `mv-${m.id}`,
    date: m.reference || m.created_at,
    category: "Pembelian Stok",
    description: `${m.stock_items?.name || m.stock_item_id} (${m.qty} unit)`,
    location: null,
    amount: (m.unit_price || 0) * (m.qty || 0),
    href: `/stok/${m.stock_item_id}`,
  }));

  // 3. BIAYA PEMELIHARAAN (dari item checklist pemeliharaan pencegahan yang ada harganya)
  const { data: checklistCosts } = await supabase
    .from("maintenance_checklist_items")
    .select("id, task, harga, schedule_id, maintenance_schedules(scheduled_date, completed_at, asset_id, assets(name, locations(name)))")
    .gt("harga", 0);

  const pemeliharaanTx: CostTransaction[] = (checklistCosts || []).map((c: any) => ({
    id: `chk-${c.id}`,
    date: c.maintenance_schedules?.completed_at || c.maintenance_schedules?.scheduled_date,
    category: "Pemeliharaan",
    description: `${c.maintenance_schedules?.assets?.name || "-"} — ${c.task}`,
    location: c.maintenance_schedules?.assets?.locations?.name || null,
    amount: c.harga || 0,
    href: `/pemeliharaan/checklist/${c.schedule_id}`,
  }));

  // 4. BIAYA PEMBELIAN ASET (dari aset yang ada biaya pembeliannya)
  const { data: assetsWithCost } = await supabase
    .from("assets")
    .select("id, name, purchase_cost, purchase_date, location_id, locations(name)")
    .gt("purchase_cost", 0);

  const asetTx: CostTransaction[] = (assetsWithCost || []).map((a: any) => ({
    id: `aset-${a.id}`,
    date: a.purchase_date,
    category: "Pembelian Aset",
    description: `${a.id}${a.name ? ` — ${a.name}` : ""}`,
    location: a.locations?.name || null,
    amount: a.purchase_cost || 0,
    href: `/registrasi-aset/${a.location_id}/${a.id}`,
  }));

  return [...perbaikanTx, ...initialStokTx, ...stokTx, ...pemeliharaanTx, ...asetTx].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// ============================================================
// BUDGET (company_budgets) — dipakai oleh Anggaran & Laporan Keuangan
// ============================================================

export interface CompanyBudgetRow {
  id: string;
  year: number;
  month: number; // 1-12
  amount: number;
}

export async function fetchAllBudgets(): Promise<CompanyBudgetRow[]> {
  const { data } = await supabase
    .from("company_budgets")
    .select("id, year, month, amount")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  return data || [];
}

// --- Cari anggaran untuk setiap bulan yang dilalui oleh rentang [startDate, endDate] ---
export interface BudgetMonthEntry {
  year: number;
  month: number; // 1-12
  amount: number; // 0 jika belum diset di company_budgets
}

export function getBudgetMonthsInRange(
  budgets: CompanyBudgetRow[],
  startDate: string,
  endDate: string
): BudgetMonthEntry[] {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const months: BudgetMonthEntry[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const match = budgets.find((b) => b.year === year && b.month === month);
    months.push({ year, month, amount: match?.amount || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}