"use client";

import React from "react";
import { Gauge, ClipboardList, CheckCircle2, Timer, ClipboardCheck, HeartPulse } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { OperationalSummary, formatDurationHours } from "@/lib/reportQueries";

interface SummaryCardsProps {
  data: OperationalSummary | null;
  isLoading: boolean;
}

export default function SummaryCards({ data, isLoading }: SummaryCardsProps) {
  const dash = isLoading ? "-" : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      <StatCard
        title="Availability Rata-Rata"
        icon={<Gauge size={18} />}
        value={dash ?? (data?.availabilityAvgPct !== null ? `${data!.availabilityAvgPct.toFixed(1)}%` : "Belum ada data")}
        description={
          data && data.availabilitySnapshotDays > 0
            ? `Dihitung dari ${data.availabilitySnapshotDays} hari yang terdata pada periode ini`
            : "Belum ada snapshot kondisi aset pada periode ini"
        }
      />

      <StatCard
        title="Total Work Order"
        icon={<ClipboardList size={18} />}
        value={dash ?? data?.totalWorkOrder ?? 0}
        description="Jumlah Work Order (korektif) yang dibuat pada periode ini"
      />

      <StatCard
        title="Total WO Selesai"
        icon={<CheckCircle2 size={18} />}
        value={dash ?? data?.totalWorkOrderSelesai ?? 0}
        description="Work Order berstatus Selesai pada periode ini"
      />

      <StatCard
        title="MTTR"
        icon={<Timer size={18} />}
        value={dash ?? formatDurationHours(data?.mttrHours ?? null)}
        description="Rata-rata waktu penyelesaian Work Order (created → completed)"
      />

      <StatCard
        title="PM Completion Rate"
        icon={<ClipboardCheck size={18} />}
        value={dash ?? `${(data?.pmCompletionRatePct ?? 0).toFixed(0)}%`}
        description={
          data
            ? `${data.pmSelesai} dari ${data.pmTotalJadwal} jadwal pemeliharaan selesai`
            : "Memuat data..."
        }
      />

      <StatCard
        title="Total Entri Buku Sakit"
        icon={<HeartPulse size={18} />}
        value={dash ?? data?.totalBukuSakit ?? 0}
        description="Laporan kerusakan yang dicatat pada periode ini"
      />
    </div>
  );
}