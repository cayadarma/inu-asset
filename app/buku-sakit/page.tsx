"use client";
import React, { useState, useEffect } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function BukuSakitPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      setIsLoading(true);
      const { data: locData } = await supabase.from("locations").select("*").order("name", { ascending: true });
      const { data: assetData } = await supabase.from("assets").select("location_id, status, is_active");
      if (locData) {
        const enriched = locData.map((loc) => {
          const assetsInLoc = assetData?.filter((a) => a.location_id === loc.id) || [];
          // PENTING: aset yang sudah dinonaktifkan (is_active === false) TIDAK dianggap
          // beroperasi/idle/pemeliharaan/perbaikan/rusak lagi, berapa pun nilai `status`
          // terakhirnya sebelum dinonaktifkan. Kategori operasional di bawah ini karena itu
          // selalu mengecualikan aset nonaktif, supaya tidak salah hitung (mis. aset yang
          // dinonaktifkan saat statusnya masih "Beroperasi" tidak ikut menaikkan angka aktif).
          const activeAssets = assetsInLoc.filter((a) => a.is_active !== false);
          return {
            ...loc,
            active: activeAssets.filter((a) => a.status === "Beroperasi").length,
            idle: activeAssets.filter((a) => a.status === "Idle").length,
            maintenance: activeAssets.filter((a) => a.status === "Pemeliharaan").length,
            repair: activeAssets.filter((a) => a.status === "Perbaikan").length,
            broken: activeAssets.filter((a) => a.status === "Rusak").length,
            nonaktif: assetsInLoc.filter((a) => a.is_active === false).length,
          };
        });
        setLocations(enriched);
      }
      setIsLoading(false);
    }
    fetchLocations();
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] font-poppins text-left">
      <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Buku Sakit</h1>
      <div className="flex flex-col gap-5">
        {isLoading ? <div className="p-10 text-center">Memuat...</div> : locations.map((loc) => (
          <Link 
            key={loc.id}
            href={`/buku-sakit/${loc.id}?name=${encodeURIComponent(loc.name)}`} // PENTING: Mengirim nama
            className="group p-6 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-primary flex items-center justify-between transition-all"
          >
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488]"><MapPin size={24} /></div>
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase">{loc.name}</h3>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                   <div className="flex flex-col gap-1">
                     <span className="px-3 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[10px] font-bold rounded-full">{loc.active} aset beroperasi</span>
                     <span className="px-3 py-0.5 bg-[#FEF3C7] text-[#EF4444] text-[10px] font-bold rounded-full">{loc.repair} aset perbaikan</span>
                     <span className="px-3 py-0.5 bg-[#EDE9FE] text-[#6D28D9] text-[10px] font-bold rounded-full">{loc.idle} aset idle</span>
                   </div>
                   <div className="flex flex-col gap-1">
                     <span className="px-3 py-0.5 bg-[#FFF7D6] text-[#E28E00] text-[10px] font-bold rounded-full">{loc.maintenance} aset pemeliharaan</span>
                     <span className="px-3 py-0.5 bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold rounded-full">{loc.broken} aset rusak</span>
                     <span className="px-3 py-0.5 bg-[#E2E8F0] text-[#475569] text-[10px] font-bold rounded-full">{loc.nonaktif} aset non-aktif</span>
                   </div>
                </div>
              </div>
            </div>
            <ChevronRight className="text-[#94A3B8] group-hover:text-primary transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}