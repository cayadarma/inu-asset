import StatCard from "../components/ui/StatCard";
import AvailabilityChart from "../components/ui/AvailabilityChart";
import StatusChart from "../components/ui/StatusChart";
import MaintenanceSummary from "../components/ui/MaintenanceSummary"; 
import RecentActivity from "../components/ui/RecentActivity"; 
import { Box, Clock, Banknote, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Home() {
  console.log("Supabase Client:", supabase);

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-10 transition-colors duration-300">
      {/* Header - Ditambahkan dark:text pada h1 dan p */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC]">Dashboard Overview</h1>
        <p className="text-[#64748B] dark:text-[#94A3B8] text-sm">Ringkasan status aset perusahaan saat ini</p>
      </div>

      {/* Row 1: Metric Cards */}
      <div className="flex flex-wrap gap-5">
        <StatCard title="Total Aset" value="1.247" description="Aset terdaftar dan terverifikasi" icon={<Box size={20} />} />
        <StatCard title="Downtime Balance" value="23 Jam" description="Total jam berhenti bulan ini" icon={<Clock size={20} />} />
        <StatCard title="Pemeliharaan Cost" value="Rp 847.5 M" description="Tahun anggaran berjalan" icon={<Banknote size={20} />} />
        <StatCard title="Asset Availability" value="94.2%" description="Rata-rata ketersediaan" icon={<ShieldCheck size={20} />} />
      </div>
      
      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AvailabilityChart />
        <StatusChart />
      </div>

      {/* Row 3: Maintenance & Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MaintenanceSummary />
        <RecentActivity />
      </div>
    </div>

  );
}