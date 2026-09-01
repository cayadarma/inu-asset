"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Activity {
  id: string;
  title: string;
  time: Date;
  href: string;
}

function timeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari yang lalu`;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true);

      const { data: schedules } = await supabase
        .from("maintenance_schedules")
        .select(`id, status, created_at, completed_at, assets ( name )`)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: reports } = await supabase
        .from("damage_reports")
        .select(`id, issue_title, created_at, asset_id, assets ( name )`)
        .order("created_at", { ascending: false })
        .limit(5);

      const scheduleActivities: Activity[] = (schedules || []).map((s: any) => ({
        id: `sch-${s.id}`,
        title: s.status === "Selesai"
          ? `${s.assets?.name || "Aset"} - Pemeliharaan selesai`
          : `${s.assets?.name || "Aset"} - Agenda pemeliharaan dijadwalkan`,
        time: new Date(s.status === "Selesai" && s.completed_at ? s.completed_at : s.created_at),
        href: `/pemeliharaan/checklist/${s.id}`,
      }));

      const reportActivities: Activity[] = (reports || []).map((r: any) => ({
        id: `rep-${r.id}`,
        title: `${r.assets?.name || "Aset"} - Laporan kerusakan baru: ${r.issue_title}`,
        time: new Date(r.created_at),
        href: `/pemeliharaan`,
      }));

      const merged = [...scheduleActivities, ...reportActivities]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 5);

      setActivities(merged);
      setIsLoading(false);
    }
    fetchActivities();
  }, []);

  return (
    <div className="flex-1 p-6 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6 transition-all duration-300">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base">Aktivitas Terbaru</h3>
        <Link href="/pemeliharaan" className="text-[13px] font-bold text-[#0D9488] dark:text-[#37BAAE] hover:underline">
          Lihat Semua
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-[#94A3B8] italic">Memuat aktivitas...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[#94A3B8] italic">Belum ada aktivitas terbaru.</p>
        ) : (
          activities.map((act) => (
            <Link
              key={act.id}
              href={act.href}
              className="pb-4 border-b border-gray-50 dark:border-[#334155] last:border-0 last:pb-0 flex flex-col gap-1 hover:opacity-70 transition-opacity"
            >
              <span className="text-[14px] font-bold text-[#334155] dark:text-[#F8FAFC]">{act.title}</span>
              <span className="text-[12px] text-[#94A3B8] font-medium italic">{timeAgo(act.time)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}