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

export default function Home() {
  // 2. Perbaikan State (Menambahkan active, maintenance, dan broken)
  const [counts, setCounts] = useState({ 
    total: 0, 
    active: 0,
    maintenance: 0,
    broken: 0,
    cost: "Rp 847.5 M", 
    availability: "94.2%" 
  });

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from("assets").select("status");
      if (data) {
        setCounts(prev => ({ 
          ...prev, 
          total: data.length,
          active: data.filter(a => a.status === 'Beroperasi').length,
          maintenance: data.filter(a => a.status === 'Pemeliharaan').length,
          broken: data.filter(a => a.status === 'Rusak' || a.status === 'Perbaikan').length,
        }));
      }
    }
    getStats();
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-10 font-poppins text-left transition-all duration-300">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Dashboard Overview</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Pemantauan kesehatan aset dan progres perbaikan teknis</p>
      </div>

      {/* BARIS 1: KPI UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Seluruh Aset" 
          value={counts.total.toLocaleString()} 
          description="Unit terdaftar di database" 
          icon={<Box size={20} />} 
        />
        <StatCard 
          title="Biaya Pemeliharaan" 
          value={counts.cost} 
          description="Anggaran tahun berjalan" 
          icon={<Banknote size={20} />} 
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