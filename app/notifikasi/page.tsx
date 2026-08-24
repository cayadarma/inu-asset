"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, AlertTriangle, ChevronRight, Clock, Box } from "lucide-react";
import Link from "next/link";

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    // Kita ambil data laporan dan join sangat dalam untuk dapat Nama Lokasi dan Nama Aset
    const { data } = await supabase
      .from("damage_reports")
      .select(`
        *,
        assets (
          name,
          location_id,
          locations ( name )
        )
      `)
      .order("created_at", { ascending: false });

    if (data) setNotifications(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto pb-10 font-poppins text-left">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl"><Bell size={28} /></div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pusat Notifikasi</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Pantau semua aktivitas laporan kerusakan terbaru</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="p-20 text-center">Memuat...</div>
        ) : (
          notifications.map((notif) => (
            <Link 
              key={notif.id}
              // PERBAIKAN LINK: Mengarah ke rute NESTED [slug]/[id]/[reportId]
              // Serta mengirimkan parameter name dan assetName agar Navbar Cantik
              href={`/buku-sakit/${notif.assets?.location_id}/${notif.asset_id}/${notif.id}?name=${notif.assets?.locations?.name}&assetName=${encodeURIComponent(notif.assets?.name)}&issueTitle=${encodeURIComponent(notif.issue_title)}`}
              className="group bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-[#0D9488] transition-all flex items-center justify-between"
            >
              <div className="flex items-start gap-5">
                <div className={`p-3 rounded-xl flex-shrink-0 ${notif.urgency?.includes('Berat') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                  {notif.urgency?.includes('Berat') ? <AlertTriangle size={24} /> : <Box size={24} />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">{notif.urgency?.split(' ')[0]}</span>
                    <span className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-widest">Laporan Baru</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#0D9488] transition-colors">{notif.issue_title}</h3>
                  <p className="text-sm text-[#475569] dark:text-[#94A3B8]">Aset: <span className="font-bold">{notif.assets?.name}</span> | Lokasi: <span className="uppercase">{notif.assets?.locations?.name}</span></p>
                </div>
              </div>
              <ChevronRight className="text-[#94A3B8] group-hover:text-[#0D9488] transition-all group-hover:translate-x-1" size={24} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}