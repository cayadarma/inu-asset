import React from "react";
import Link from "next/link";

export default function RecentActivity() {
  const activities = [
    { title: "Genset #12 - Pemeliharaan selesai", time: "10 menit yang lalu" },
    { title: "Pompa Air #3 - Laporan kerusakan baru", time: "45 menit yang lalu" },
    { title: "Compressor B - Kalibrasi selesai", time: "2 jam yang lalu" },
  ];

  return (
    <div className="flex-1 p-6 bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] dark:border-[#334155] shadow-sm flex flex-col gap-6 transition-all duration-300">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] text-base">Aktivitas Terbaru</h3>
        <Link href="/pemeliharaan" className="text-[13px] font-bold text-[#0D9488] dark:text-[#37BAAE] hover:underline">
          Lihat Semua
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {activities.map((act, index) => (
          <div key={index} className="pb-4 border-b border-gray-50 dark:border-[#334155] last:border-0 last:pb-0 flex flex-col gap-1">
            <span className="text-[14px] font-bold text-[#334155] dark:text-[#F8FAFC]">{act.title}</span>
            <span className="text-[12px] text-[#94A3B8] font-medium italic">{act.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}