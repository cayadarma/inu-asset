"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Banknote, Wrench, Package, ChevronDown, ClipboardCheck, Boxes, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type CostCategory = "Perbaikan" | "Pembelian Stok" | "Pemeliharaan" | "Pembelian Aset";

interface CostTransaction {
  id: string;
  date: string; // ISO date dipakai untuk sorting & grouping bulan
  category: CostCategory;
  description: string;
  location: string | null;
  amount: number;
  href: string;
}

// --- KONFIGURASI 4 KATEGORI BIAYA (DIPAKAI BERSAMA UNTUK CARD, FILTER, & CHART) ---
const CATEGORIES: { key: CostCategory; label: string; color: string; icon: any; bg: string; text: string }[] = [
  { key: "Pemeliharaan", label: "Biaya Pemeliharaan", color: "#0D9488", icon: ClipboardCheck, bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-[#0D9488]" },
  { key: "Perbaikan", label: "Biaya Perbaikan", color: "#E28E00", icon: Wrench, bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-[#E28E00]" },
  { key: "Pembelian Stok", label: "Biaya Pembelian Stok", color: "#3B82F6", icon: Package, bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-[#3B82F6]" },
  { key: "Pembelian Aset", label: "Biaya Pembelian Aset", color: "#8B5CF6", icon: Boxes, bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-[#8B5CF6]" },
];

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const currentYear = new Date().getFullYear();

export default function CostAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<CostTransaction[]>([]);

  // --- FILTER (DEFAULT: TAHUN INI SAJA. UNTUK LIHAT TAHUN LALU, GANTI RENTANG TANGGAL DI SINI) ---
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  // --- FILTER TAHUN UNTUK CHART TREN BULANAN ---
  const [chartYear, setChartYear] = useState(currentYear);

  const fetchData = async () => {
    setIsLoading(true);

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
    // 2a. Ambil semua item stok (untuk hitung nilai pembelian awal, sama seperti di halaman detail stok)
    const { data: stockItems } = await supabase
      .from("stock_items")
      .select("id, name, qty, purchase_price, created_at");

    // 2b. Ambil semua pergerakan stok tipe "Masuk" yang punya harga per unit
    const { data: movements } = await supabase
      .from("stock_movements")
      .select("id, stock_item_id, type, qty, unit_price, created_at, reference, stock_items(name)")
      .eq("type", "Masuk")
      .not("unit_price", "is", null);

    // Perlu SEMUA pergerakan (masuk & keluar) per item untuk menghitung qty awal, bukan hanya yang masuk & berharga
    const { data: allMovementsForQty } = await supabase
      .from("stock_movements")
      .select("stock_item_id, type, qty");

    const netQtyByItem = new Map<string, number>();
    (allMovementsForQty || []).forEach((m: any) => {
      const delta = m.type === "Masuk" ? m.qty : -m.qty;
      netQtyByItem.set(m.stock_item_id, (netQtyByItem.get(m.stock_item_id) || 0) + delta);
    });

    // 2c. Nilai pembelian awal per item (qty awal x harga per unit di data item)
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

    // 2d. Nilai pembelian dari seluruh riwayat pergerakan "Masuk"
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

    const all = [...perbaikanTx, ...initialStokTx, ...stokTx, ...pemeliharaanTx, ...asetTx].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setTransactions(all);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTx = transactions.filter((tx) => {
    const matchCategory = !categoryFilter || tx.category === categoryFilter;
    const txDate = tx.date?.slice(0, 10) || "";
    const matchStart = !startDate || txDate >= startDate;
    const matchEnd = !endDate || txDate <= endDate;
    return matchCategory && matchStart && matchEnd;
  });

  // --- RINGKASAN PER KATEGORI (SESUAI FILTER RENTANG TANGGAL YANG AKTIF) ---
  const totalsByCategory = useMemo(() => {
    const totals: Record<CostCategory, number> = { Pemeliharaan: 0, Perbaikan: 0, "Pembelian Stok": 0, "Pembelian Aset": 0 };
    filteredTx.forEach((tx) => { totals[tx.category] += tx.amount; });
    return totals;
  }, [filteredTx]);

  const totalKeseluruhan = CATEGORIES.reduce((s, c) => s + totalsByCategory[c.key], 0);

  // --- PERBANDINGAN VS TAHUN LALU (BERDASARKAN TAHUN AWAL RENTANG YANG DIPILIH) ---
  const focusYear = startDate ? new Date(startDate + "T00:00:00").getFullYear() : currentYear;

  const yoyByCategory = useMemo(() => {
    const sumForYear = (cat: CostCategory | "ALL", year: number) =>
      transactions
        .filter((tx) => (cat === "ALL" || tx.category === cat) && new Date(tx.date).getFullYear() === year)
        .reduce((s, tx) => s + tx.amount, 0);

    const calcPct = (thisYear: number, lastYear: number) => {
      if (lastYear === 0) return thisYear > 0 ? 100 : 0;
      return Math.round(((thisYear - lastYear) / lastYear) * 100);
    };

    const result: Record<string, number> = {};
    CATEGORIES.forEach((c) => {
      result[c.key] = calcPct(sumForYear(c.key, focusYear), sumForYear(c.key, focusYear - 1));
    });
    result["ALL"] = calcPct(sumForYear("ALL", focusYear), sumForYear("ALL", focusYear - 1));
    return result;
  }, [transactions, focusYear]);

  // --- GRAFIK TREN BULANAN (12 BULAN, JAN-DES, TAHUN YANG DIPILIH) ---
  const bulanLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  // --- DAFTAR TAHUN YANG TERSEDIA UNTUK DROPDOWN FILTER TAHUN ---
  const availableYears = useMemo(() => {
    let minYear = currentYear;
    let maxYear = currentYear;
    transactions.forEach((tx) => {
      const y = new Date(tx.date).getFullYear();
      if (isNaN(y)) return;
      if (y < minYear) minYear = y;
      if (y > maxYear) maxYear = y;
    });
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) years.push(y);
    return years;
  }, [transactions]);

  const monthlyChart = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const base: any = { label: bulanLabels[i], sortKey: `${chartYear}-${String(i + 1).padStart(2, "0")}` };
      CATEGORIES.forEach((c) => { base[c.key] = 0; });
      return base;
    });

    // Chart menampilkan tahun yang dipilih secara penuh; hanya filter kategori yang berlaku, bukan filter tanggal
    transactions
      .filter((tx) => !categoryFilter || tx.category === categoryFilter)
      .forEach((tx) => {
        const d = new Date(tx.date);
        if (d.getFullYear() !== chartYear) return;
        const monthIndex = d.getMonth();
        months[monthIndex][tx.category] += tx.amount;
      });

    return months;
  }, [transactions, categoryFilter, chartYear]);

  const maxMonthly = Math.max(1, ...monthlyChart.map((m) => CATEGORIES.reduce((s, c) => s + m[c.key], 0)));
  const CHART_HEIGHT_PX = 200;

  const YoyBadge = ({ pct }: { pct: number }) => {
    if (pct === 0) return <span className="text-[12px] text-[#94A3B8]">Sama seperti tahun lalu</span>;
    const isUp = pct > 0;
    return (
      <span className={`inline-flex items-center gap-1 text-[12px] font-bold ${isUp ? "text-[#EF4444]" : "text-[#10B981]"}`}>
        {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {Math.abs(pct)}% dari tahun lalu
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left">
      {/* HEADER & FILTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Analisis Biaya</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Pantau dan analisis pengeluaran pemeliharaan, perbaikan, dan pembelian aset & stok secara real-time</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] outline-none focus:border-primary"
          />
          <span className="self-center text-[#94A3B8] text-sm">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] outline-none focus:border-primary"
          />
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] font-bold cursor-pointer outline-none focus:border-primary"
            >
              <option value="">Semua Kategori</option>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label.replace("Biaya ", "")}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>
        </div>
      </div>
      <p className="-mt-4 text-xs text-[#94A3B8] italic">
        Menampilkan data tahun {focusYear} secara default. Untuk melihat tahun lain, ganti rentang tanggal di atas.
      </p>

      {/* ROW 1: SUMMARY CARDS (5 CARD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[14px] text-[#475569] dark:text-[#94A3B8] font-medium">Total Biaya Keseluruhan</span>
            <div className="w-9 h-9 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488]">
              <Banknote size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{isLoading ? "-" : formatRupiah(totalKeseluruhan)}</div>
          <p className="text-[12px] text-[#94A3B8] mt-1 mb-2">Pemeliharaan + Perbaikan + Pembelian Stok + Pembelian Aset</p>
          {!isLoading && <YoyBadge pct={yoyByCategory["ALL"] || 0} />}
        </div>

        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const total = totalsByCategory[c.key];
          const pct = totalKeseluruhan > 0 ? Math.round((total / totalKeseluruhan) * 100) : 0;
          return (
            <div key={c.key} className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[14px] text-[#475569] dark:text-[#94A3B8] font-medium">{c.label}</span>
                <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center ${c.text}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${c.text}`}>{isLoading ? "-" : formatRupiah(total)}</div>
              <p className="text-[12px] text-[#94A3B8] mt-1 mb-2">{pct}% dari total biaya</p>
              {!isLoading && <YoyBadge pct={yoyByCategory[c.key] || 0} />}
            </div>
          );
        })}
      </div>

      {/* ROW 2: GRAFIK TREN BULANAN */}
      <div className="bg-white dark:bg-[#1E293B] p-4 sm:p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col min-h-[380px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base">Tren Biaya Bulanan</h3>
          <div className="flex flex-col xs:flex-row sm:items-center gap-3">
            <div className="relative w-fit">
              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="appearance-none pl-4 pr-9 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] font-bold cursor-pointer outline-none focus:border-primary"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] font-bold">
              {CATEGORIES.map((c) => (
                <span key={c.key} className="flex items-center gap-1.5 text-[#94A3B8]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: c.color }}></span>
                  {c.label.replace("Biaya ", "")}
                </span>
              ))}
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-[#94A3B8] text-sm">Memuat data...</div>
        ) : monthlyChart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[#94A3B8] text-sm italic">Belum ada data biaya untuk ditampilkan.</div>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-end justify-between gap-2 sm:gap-4 h-[220px] pt-4 border-b border-gray-50 dark:border-[#334155] pb-2 min-w-[560px] sm:min-w-0">
              {monthlyChart.map((data) => {
                const total = CATEGORIES.reduce((s, c) => s + data[c.key], 0);
                return (
                  <div key={data.sortKey} className="flex-1 min-w-[36px] flex flex-col justify-end items-center gap-2 sm:gap-3 group">
                    <div className="w-full flex flex-col-reverse justify-start relative" style={{ height: CHART_HEIGHT_PX }}>
                      {CATEGORIES.map((c) => {
                        const h = Math.round((data[c.key] / maxMonthly) * CHART_HEIGHT_PX);
                        return (
                          <div
                            key={c.key}
                            style={{ height: `${h}px`, backgroundColor: c.color }}
                            className="w-full hover:opacity-80 transition-all first:rounded-t-sm"
                          />
                        );
                      })}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                        {formatRupiah(total)}
                      </div>
                    </div>
                    <span className="text-[12px] text-[#94A3B8] font-bold">{data.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ROW 3: TABEL RINCIAN TRANSAKSI */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b border-gray-100 dark:border-[#334155]">
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base">Rincian Transaksi Biaya</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4 text-right">Jumlah Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
              ) : filteredTx.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-[#94A3B8] italic">Belum ada transaksi biaya pada rentang/kategori ini.</td></tr>
              ) : (
                filteredTx.map((tx) => {
                  const catConfig = CATEGORIES.find((c) => c.key === tx.category);
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-colors">
                      <td className="px-6 py-4 text-[#475569] dark:text-[#94A3B8] font-medium">
                        {tx.date ? new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${catConfig?.bg || ""} ${catConfig?.text || ""}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={tx.href} className="font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#0D9488] transition-colors">
                          {tx.description}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[#475569] dark:text-[#94A3B8]">{tx.location || "-"}</td>
                      <td className="px-6 py-4 text-right font-black text-[#0D9488]">{formatRupiah(tx.amount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}