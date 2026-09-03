"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, AlertTriangle, ChevronRight, Clock, Box, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // 1. Tambahkan router

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    setIsLoading(true);
    // 2. MODIFIKASI: Pastikan query mengambil data paling fresh
    const { data, error } = await supabase
      .from("damage_reports")
      .select(`
        *,
        assets (
          name,
          location_id,
          locations ( name )
        )
      `)
      .eq("is_read", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    // 3. Update database
    const { error } = await supabase
      .from("damage_reports")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      router.refresh(); // Beritahu Next.js data berubah
    } else {
      alert("Gagal menghapus: " + error.message);
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    
    // 4. Update semua yang masih is_read = false menjadi true
    const { error } = await supabase
      .from("damage_reports")
      .update({ is_read: true })
      .eq("is_read", false);

    if (!error) {
      setNotifications([]);
      router.refresh();
    } else {
      alert("Gagal membersihkan: " + error.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto pb-10 font-poppins text-left">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl"><Bell size={28} /></div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pusat Notifikasi</h1>
            <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Anda memiliki {notifications.length} pesan baru</p>
          </div>
        </div>
        {notifications.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all">
            <Trash2 size={18} /> Bersihkan Semua
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="p-20 text-center dark:text-white">Memuat...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] p-20 rounded-3xl border border-dashed border-gray-200 dark:border-[#334155] text-[#94A3B8] dark:text-gray text-center flex flex-col items-center gap-4">
             <Bell size={48} className="text-[#94A3B8] dark:text-gray" />
             <p className="text-secondary font-medium italic">Tidak ada notifikasi baru.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="group relative">
              <Link 
                href={`/buku-sakit/${notif.assets?.location_id}/${notif.asset_id}/${notif.id}?name=${encodeURIComponent(notif.assets?.locations?.name || "")}&assetName=${encodeURIComponent(notif.assets?.name || "")}&issueTitle=${encodeURIComponent(notif.issue_title)}`}
                className="block bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-[#0D9488] transition-all"
              >
                <div className="flex items-start gap-5 pr-12">
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
                    <p className="text-[11px] text-[#94A3B8] mt-1 italic"><Clock size={12} className="inline mr-1"/> {new Date(notif.created_at).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </Link>
              
              <button 
                onClick={(e) => { e.preventDefault(); markAsRead(notif.id); }}
                className="absolute top-5 right-5 p-2 text-[#94A3B8] hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-[#0F172A] rounded-full transition-all"
              >
                <Check size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}