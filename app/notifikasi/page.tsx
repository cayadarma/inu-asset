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
    // MODIFIKASI: Kita tarik data lebih dalam (Reports -> Assets -> Locations)
    // agar kita bisa dapat NAMA LOKASI untuk ditaruh di URL (?name=...)
    const { data, error } = await supabase
      .from("damage_reports")
      .select(`
        *,
        assets (
          name,
          location_id,
          locations (
            name
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setNotifications(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto pb-10 font-poppins text-left">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl">
          <Bell size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pusat Notifikasi</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Pantau semua aktivitas dan laporan kerusakan aset terbaru</p>
        </div>
      </div>

      {/* List Notifikasi */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="p-20 text-center text-secondary">Memuat notifikasi...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] p-20 rounded-3xl border border-dashed border-gray-200 dark:border-[#334155] text-center flex flex-col items-center gap-4">
            <Bell size={48} className="text-gray-200" />
            <p className="text-secondary font-medium">Belum ada notifikasi baru.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            // Ambil data dari hasil join
            const locId = notif.assets?.location_id;
            const locName = notif.assets?.locations?.name;
            const assetId = notif.asset_id;

            return (
              <Link 
                key={notif.id}
                // MODIFIKASI LINK: Mengarah ke DETAIL ([id]) dan membawa parameter NAME
                href={`/buku-sakit/detail-laporan/${notif.id}?name=${locName}`}
                className="group bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-[#0D9488] transition-all flex items-center justify-between"
              >
                <div className="flex items-start gap-5">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${notif.urgency?.includes('Berat') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    {notif.urgency?.includes('Berat') ? <AlertTriangle size={24} /> : <Box size={24} />}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-tight">
                        Laporan Kerusakan Baru
                      </span>
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black rounded uppercase">
                        {notif.urgency?.split(' ')[0]}
                      </span>
                    </div>
                    <h3 className="text-[16px] font-bold text-[#0D9488] group-hover:underline">
                      {notif.issue_title}
                    </h3>
                    <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
                      Aset: <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{notif.assets?.name}</span> 
                      <span className="mx-2">|</span> 
                      Lokasi: <span className="font-bold text-[#0D9488] uppercase">{locName}</span>
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-[11px] text-[#94A3B8] font-medium">
                      <span className="flex items-center gap-1"><Clock size={12}/> {new Date(notif.created_at).toLocaleString('id-ID')}</span>
                      <span className="flex items-center gap-1 font-bold text-[#475569] dark:text-[#F8FAFC]">Pelapor: {notif.reporter_name}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[#94A3B8] group-hover:text-[#0D9488] transition-all group-hover:translate-x-1">
                  <ChevronRight size={24} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}