"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "../components/ui/StatCard";
import AvailabilityChart from "../components/ui/AvailabilityChart";
import StatusChart from "../components/ui/StatusChart";
import MaintenanceSummary from "../components/ui/MaintenanceSummary"; 
import RecentActivity from "../components/ui/RecentActivity"; 
// 1. Perbaikan Import Ikon
import { Box, Banknote, ShieldCheck, PlayCircle, Wrench, AlertCircle, ClipboardCheck, Package, Boxes, Wallet } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const formatRupiahShort = (n: number) =>
  n >= 1_000_000_000
    ? `Rp ${(n / 1_000_000_000).toFixed(1)} M`
    : n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toFixed(1)} Jt`
    : `Rp ${n.toLocaleString("id-ID")}`;

export default function Home() {
  const { t } = useLanguage();
  // 2. Perbaikan State (Menambahkan active, maintenance, dan broken)
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    idle: 0,
    maintenance: 0,
    broken: 0,
    cost: "Rp 0",
    availability: "0%",
    addedThisYear: 0,
    addedThisMonth: 0,
    budgetAmount: 0,
    budgetUsedPct: 0,
    realisasiPct: 0,
    realisasiSelesai: 0,
    realisasiTotal: 0,
    biayaPemeliharaan: 0,
    biayaPerbaikan: 0,
    biayaStok: 0,
    biayaAset: 0,
  });

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from("assets").select("status, purchase_date");
      if (!data) return;

      const total = data.length;
      const active = data.filter((a) => a.status === "Beroperasi").length;
      const idle = data.filter((a) => a.status === "Idle").length;
      const maintenance = data.filter((a) => a.status === "Pemeliharaan").length;
      const perbaikan = data.filter((a) => a.status === "Perbaikan").length;
      const rusak = data.filter((a) => a.status === "Rusak").length;

      // --- AKUMULASI PENAMBAHAN ASET (BERDASARKAN TANGGAL PEMBELIAN, BUKAN TANGGAL INPUT) ---
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth();
      const addedThisYear = data.filter((a) => a.purchase_date && new Date(a.purchase_date).getFullYear() === thisYear).length;
      const addedThisMonth = data.filter((a) => {
        if (!a.purchase_date) return false;
        const d = new Date(a.purchase_date);
        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
      }).length;

      // --- ASSET AVAILABILITY: STATUS "BEROPERASI", "IDLE" & "PEMELIHARAAN" DIHITUNG TERSEDIA ---
      // Status "Rusak" dan "Perbaikan" TIDAK dihitung sebagai tersedia.
      const availabilityPct = total > 0 ? ((active + idle + maintenance) / total) * 100 : 0;

      setCounts((prev) => ({
        ...prev,
        total,
        active,
        idle,
        maintenance,
        broken: rusak + perbaikan,
        availability: `${availabilityPct.toFixed(1)}%`,
        addedThisYear,
        addedThisMonth,
      }));

      // --- SERAPAN BIAYA BULAN INI: GABUNGAN 4 KATEGORI (PEMELIHARAAN, PERBAIKAN, PEMBELIAN STOK, PEMBELIAN ASET) ---
      const nowForCost = new Date();
      const costYear = nowForCost.getFullYear();
      const costMonth = nowForCost.getMonth(); // 0-11
      const isThisMonth = (dateStr: string | null) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === costYear && d.getMonth() === costMonth;
      };

      // 1. Biaya Perbaikan (Work Order, dated by completed_at/created_at)
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("actual_cost, completed_at, created_at")
        .gt("actual_cost", 0);
      const totalPerbaikanBulanIni = (workOrders || [])
        .filter((wo) => isThisMonth(wo.completed_at || wo.created_at))
        .reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);

      // 2. Biaya Pembelian Stok (dated by reference/created_at)
      const { data: movements } = await supabase
        .from("stock_movements")
        .select("qty, unit_price, reference, created_at")
        .eq("type", "Masuk")
        .not("unit_price", "is", null);
      const totalStokBulanIni = (movements || [])
        .filter((m) => isThisMonth(m.reference || m.created_at))
        .reduce((sum, m) => sum + (m.unit_price || 0) * (m.qty || 0), 0);

      // 3. Biaya Pemeliharaan (item checklist yang ada harganya, dated dari jadwal pemeliharaannya)
      const { data: checklistCosts } = await supabase
        .from("maintenance_checklist_items")
        .select("harga, maintenance_schedules(scheduled_date, completed_at)")
        .gt("harga", 0);
      const totalPemeliharaanBulanIni = (checklistCosts || [])
        .filter((c: any) => isThisMonth(c.maintenance_schedules?.completed_at || c.maintenance_schedules?.scheduled_date))
        .reduce((sum: number, c: any) => sum + (c.harga || 0), 0);

      // 4. Biaya Pembelian Aset (dated by purchase_date)
      const { data: assetsWithCost } = await supabase
        .from("assets")
        .select("purchase_cost, purchase_date")
        .gt("purchase_cost", 0);
      const totalAsetBulanIni = (assetsWithCost || [])
        .filter((a) => isThisMonth(a.purchase_date))
        .reduce((sum, a) => sum + (a.purchase_cost || 0), 0);

      const totalBiaya = totalPerbaikanBulanIni + totalStokBulanIni + totalPemeliharaanBulanIni + totalAsetBulanIni;
      const formattedCost =
        totalBiaya >= 1_000_000_000
          ? `Rp ${(totalBiaya / 1_000_000_000).toFixed(1)} M`
          : totalBiaya >= 1_000_000
          ? `Rp ${(totalBiaya / 1_000_000).toFixed(1)} Jt`
          : `Rp ${totalBiaya.toLocaleString("id-ID")}`;

      // --- ANGGARAN PERUSAHAAN BULAN INI ---
      const { data: budgetRow } = await supabase
        .from("company_budgets")
        .select("amount")
        .eq("year", costYear)
        .eq("month", costMonth + 1)
        .maybeSingle();
      const budgetAmount = budgetRow?.amount || 0;
      const budgetUsedPct = budgetAmount > 0 ? Math.round((totalBiaya / budgetAmount) * 100) : 0;

      setCounts((prev) => ({
        ...prev,
        cost: formattedCost,
        budgetAmount,
        budgetUsedPct,
        biayaPemeliharaan: totalPemeliharaanBulanIni,
        biayaPerbaikan: totalPerbaikanBulanIni,
        biayaStok: totalStokBulanIni,
        biayaAset: totalAsetBulanIni,
      }));

      // --- REALISASI PROGRAM KERJA (PREVENTIVE MAINTENANCE) BULAN INI ---
      // Hanya dari agenda pemeliharaan pencegahan (BUKAN Work Order korektif/perbaikan).
      const monthStart = `${costYear}-${String(costMonth + 1).padStart(2, "0")}-01`;
      const monthEndDate = new Date(costYear, costMonth + 1, 0); // hari terakhir bulan ini
      const monthEnd = monthEndDate.toISOString().slice(0, 10);

      const { data: agendaBulanIni } = await supabase
        .from("maintenance_schedules")
        .select("status")
        .gte("scheduled_date", monthStart)
        .lte("scheduled_date", monthEnd);

      const realisasiTotal = (agendaBulanIni || []).length;
      const realisasiSelesai = (agendaBulanIni || []).filter((a) => a.status === "Selesai").length;
      const realisasiPct = realisasiTotal > 0 ? Math.round((realisasiSelesai / realisasiTotal) * 100) : 0;

      setCounts((prev) => ({ ...prev, realisasiPct, realisasiSelesai, realisasiTotal }));

      // --- CATAT "POTRET" STATUS ASET HARI INI UNTUK GRAFIK TREN ---
      // Di-upsert (insert atau update jika sudah ada) berdasarkan snapshot_date,
      // supaya selalu mencerminkan kondisi terbaru pada hari berjalan.
      const today = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
      await supabase.from("asset_status_snapshots").upsert(
        [{
          snapshot_date: today,
          beroperasi: active,
          idle: idle,
          pemeliharaan: maintenance,
          perbaikan: perbaikan,
          rusak: rusak,
          total: total,
          updated_at: new Date().toISOString(),
        }],
        { onConflict: "snapshot_date" }
      );
    }
    getStats();
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-10 font-poppins text-left transition-all duration-300">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("dashboard.overview")}</h1>
      </div>

      {/* RINGKASAN ASET */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base uppercase tracking-wider">Ringkasan Aset</h3>
          <p className="text-[#94A3B8] text-xs mt-1">Kondisi & ketersediaan aset saat ini</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <StatCard
            title="Total Seluruh Aset"
            value={counts.total.toLocaleString()}
            description={`Unit aset yang terdaftar di sistem (per ${new Date().getFullYear()})`}
            icon={<Box size={20} />}
            href="/registrasi-aset/semua"
            extra={
              <div className="flex flex-col gap-0.5 text-[11px] font-bold">
                <span className="text-[#0D9488]">+{counts.addedThisYear} aset baru tahun ini</span>
                <span className="text-[#94A3B8]">+{counts.addedThisMonth} aset baru bulan ini</span>
              </div>
            }
          />
          <StatCard
            title="Asset Availability"
            value={counts.availability}
            description="Persentase aset yang siap dipakai saat ini"
            icon={<ShieldCheck size={20} />}
          />
          <StatCard
            title="Realisasi Program Kerja"
            value={`${counts.realisasiPct}%`}
            description="Agenda pemeliharaan pencegahan bulan ini"
            icon={<ClipboardCheck size={20} />}
            href="/pemeliharaan"
            extra={
              <span className="text-[11px] font-bold text-[#94A3B8]">
                {counts.realisasiSelesai} dari {counts.realisasiTotal} agenda selesai
              </span>
            }
          />
          <StatCard
            title="Unit Beroperasi"
            value={counts.active}
            description="Sedang dipakai & bekerja normal"
            icon={<PlayCircle size={20} className="text-emerald-500" />}
          />
          <StatCard
            title="Unit Pemeliharaan"
            value={counts.maintenance}
            description="Sedang dicek/dirawat rutin terjadwal"
            icon={<Wrench size={20} className="text-amber-500" />}
          />
          <StatCard
            title="Unit Rusak / Perbaikan"
            value={counts.broken}
            description="Rusak menunggu diperbaiki atau sedang ditangani"
            icon={<AlertCircle size={20} className="text-red-500" />}
          />
        </div>
      </div>

      {/* DAFTAR WORK ORDER */}
      <div className="w-full">
        <MaintenanceSummary />
      </div>

      {/* RINGKASAN KEUANGAN/MANAJEMEN */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base uppercase tracking-wider">Ringkasan Keuangan/Manajemen</h3>
          <p className="text-[#94A3B8] text-xs mt-1">Anggaran & realisasi biaya bulan berjalan</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <StatCard
            title="Anggaran Bulan Ini"
            value={counts.budgetAmount > 0 ? formatRupiahShort(counts.budgetAmount) : "Belum diatur"}
            description="Anggaran biaya yang ditetapkan untuk bulan ini"
            icon={<Wallet size={20} />}
            href="/anggaran"
          />
          <StatCard
            title="Serapan Biaya Bulan Ini"
            value={counts.cost}
            description="Total pengeluaran bulan ini (semua kategori biaya)"
            icon={<Banknote size={20} />}
            href="/analisis-biaya"
            extra={
              counts.budgetAmount > 0 ? (
                <span className={`text-[11px] font-bold ${counts.budgetUsedPct >= 100 ? "text-[#EF4444]" : counts.budgetUsedPct >= 80 ? "text-[#F59E0B]" : "text-[#0D9488]"}`}>
                  {counts.budgetUsedPct}% anggaran terpakai
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#94A3B8] italic">Anggaran bulan ini belum diatur</span>
              )
            }
          />
          <StatCard
            title="Biaya Pemeliharaan"
            value={formatRupiahShort(counts.biayaPemeliharaan)}
            description="Biaya pemeliharaan checklist bulan ini"
            icon={<ClipboardCheck size={20} />}
            href="/analisis-biaya"
          />
          <StatCard
            title="Biaya Perbaikan"
            value={formatRupiahShort(counts.biayaPerbaikan)}
            description="Biaya Work Order korektif bulan ini"
            icon={<Wrench size={20} />}
            href="/analisis-biaya"
          />
          <StatCard
            title="Biaya Pembelian Stok"
            value={formatRupiahShort(counts.biayaStok)}
            description="Biaya pembelian stok/sparepart bulan ini"
            icon={<Package size={20} />}
            href="/analisis-biaya"
          />
          <StatCard
            title="Biaya Pembelian Aset"
            value={formatRupiahShort(counts.biayaAset)}
            description="Biaya pembelian aset baru bulan ini"
            icon={<Boxes size={20} />}
            href="/analisis-biaya"
          />
        </div>
      </div>

      {/* TREN STATUS ASET / MONITORING STATUS BULANAN */}
      <div className="w-full">
        <AvailabilityChart />
      </div>

      {/* STATUS OPERASIONAL & AKTIVITAS TERBARU */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StatusChart />
        <RecentActivity />
      </div>

    </div>
  );
}