import StatCard from "../components/ui/StatCard";
import AvailabilityChart from "../components/ui/AvailabilityChart";
import StatusChart from "../components/ui/StatusChart";
import MaintenanceSummary from "../components/ui/MaintenanceSummary"; // 1. Import
import RecentActivity from "../components/ui/RecentActivity"; // 2. Import
import { Box, Clock, Banknote, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard Overview</h1>
        <p className="text-[#64748B] text-sm">Ringkasan status aset perusahaan saat ini</p>
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