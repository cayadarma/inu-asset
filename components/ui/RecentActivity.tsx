import React from "react";
import Link from "next/link"; // Tambahkan import Link

export default function RecentActivity() {
  const activities = [
    { title: "Genset #12 - Pemeliharaan selesai", time: "10 menit yang lalu" },
    { title: "Pompa Air #3 - Laporan kerusakan baru", time: "45 menit yang lalu" },
    { title: "Compressor B - Kalibrasi selesai", time: "2 jam yang lalu" },
  ];

  return (
    <div className="flex-1 p-6 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-[#0F172A] text-base">Aktivitas Terbaru</h3>
        {/* Ubah button menjadi Link ke halaman pemeliharaan */}
        <Link href="/pemeliharaan" className="text-[13px] font-semibold text-[#0D9488] hover:underline">
          Lihat Semua
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {activities.map((act, index) => (
          <div key={index} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0 flex flex-col gap-1">
            <span className="text-[14px] font-medium text-[#334155]">{act.title}</span>
            <span className="text-[12px] text-[#94A3B8]">{act.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}