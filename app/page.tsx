"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "../components/ui/StatCard";
import AvailabilityChart from "../components/ui/AvailabilityChart";
import StatusChart from "../components/ui/StatusChart";
import MaintenanceSummary from "../components/ui/MaintenanceSummary"; 
import RecentActivity from "../components/ui/RecentActivity"; 
// 1. Perbaikan Import Ikon
import { Box, Banknote, ShieldCheck, PlayCircle, Wrench, AlertCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  // 2. Perbaikan State (Menambahkan active, maintenance, dan broken)
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    broken: 0,
    cost: "Rp 0",
    availability: "0%",
  });

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from("assets").select("status");
      if (!data) return;

      const total = data.length;
      const active = data.filter((a) => a.status === "Beroperasi").length;
      const maintenance = data.filter((a) => a.status === "Pemeliharaan").length;
      const perbaikan = data.filter((a) => a.status === "Perbaikan").length;
      const rusak = data.filter((a) => a.status === "Rusak").length;

      // --- ASSET AVAILABILITY: HANYA STATUS "BEROPERASI" & "PEMELIHARAAN" YANG DIHITUNG TERSEDIA ---
      // Status "Rusak" dan "Perbaikan" TIDAK dihitung sebagai tersedia.
      const availabilityPct = total > 0 ? ((active + maintenance) / total) * 100 : 0;

      setCounts((prev) => ({
        ...prev,
        total,
        active,
        maintenance,
        broken: rusak + perbaikan,
        availability: `${availabilityPct.toFixed(1)}%`,
      }));

      // --- HITUNG BIAYA PEMELIHARAAN: BIAYA PERBAIKAN + BIAYA PEMBELIAN STOK ---
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("actual_cost")
        .gt("actual_cost", 0);
      const totalPerbaikan = (workOrders || []).reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);

      const { data: movements } = await supabase
        .from("stock_movements")
        .select("qty, unit_price")
        .eq("type", "Masuk")
        .not("unit_price", "is", null);
      const totalStok = (movements || []).reduce((sum, m) => sum + (m.unit_price || 0) * (m.qty || 0), 0);

      const totalBiaya = totalPerbaikan + totalStok;
      const formattedCost =
        totalBiaya >= 1_000_000_000
          ? `Rp ${(totalBiaya / 1_000_000_000).toFixed(1)} M`
          : totalBiaya >= 1_000_000
          ? `Rp ${(totalBiaya / 1_000_000).toFixed(1)} Jt`
          : `Rp ${totalBiaya.toLocaleString("id-ID")}`;

      setCounts((prev) => ({ ...prev, cost: formattedCost }));

      // --- CATAT "POTRET" STATUS ASET HARI INI UNTUK GRAFIK TREN ---
      // Di-upsert (insert atau update jika sudah ada) berdasarkan snapshot_date,
      // supaya selalu mencerminkan kondisi terbaru pada hari berjalan.
      const today = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
      await supabase.from("asset_status_snapshots").upsert(
        [{
          snapshot_date: today,
          beroperasi: active,
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

      {/* BARIS 1: KPI UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Seluruh Aset" 
          value={counts.total.toLocaleString()} 
          description="Unit terdaftar di database" 
          icon={<Box size={20} />} 
          href="/registrasi-aset/semua"
        />
        <StatCard 
          title="Biaya Pemeliharaan" 
          value={counts.cost} 
          description="Biaya perbaikan + pembelian stok" 
          icon={<Banknote size={20} />} 
          href="/analisis-biaya"
        />
        <StatCard 
          title="Asset Availability" 
          value={counts.availability} 
          description="Rata-rata kesiapan alat" 
          icon={<ShieldCheck size={20} />} 
        />
      </div>

      {/* BARIS 2: STATUS OPERASIONAL */}
      <div className="flex flex-col gap-4">
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base uppercase tracking-wider">Ringkasan Pemeliharaan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Unit Beroperasi" 
            value={counts.active} 
            description="Alat sedang bekerja normal" 
            icon={<PlayCircle size={20} className="text-emerald-500" />} 
          />
          <StatCard 
            title="Unit Pemeliharaan" 
            value={counts.maintenance} 
            description="Sedang servis rutin berkala" 
            icon={<Wrench size={20} className="text-amber-500" />} 
          />
          <StatCard 
            title="Unit Rusak / Perbaikan" 
            value={counts.broken} 
            description="Membutuhkan tindakan segera" 
            icon={<AlertCircle size={20} className="text-red-500" />} 
          />
        </div>
      </div>
      
      {/* BARIS 3: TREN STATUS ASET */}
      <div className="w-full">
        <AvailabilityChart />
      </div>

      {/* BARIS 4: STATUS OPERASIONAL & AKTIVITAS TERBARU */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StatusChart />
        <RecentActivity />
      </div>

      {/* BARIS 5: DAFTAR WORK ORDER */}
      <div className="w-full">
        <MaintenanceSummary />
      </div>

    </div>
  );
}