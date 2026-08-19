import React from "react";
import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; // 1. Import koneksi database

export default async function RegistrasiAsetPage() {
  // 2. Ambil data asli dari tabel locations di Supabase
  const { data: locations, error } = await supabase
    .from("locations")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return <div className="p-10 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1000px] font-poppins text-left">
      {/* Judul */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Registrasi Aset</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Pilih lokasi untuk melihat daftar aset</p>
      </div>

      {/* List Lokasi (Data dari Supabase) */}
      <div className="grid grid-cols-1 gap-4">
        {locations?.map((loc) => (
          <Link 
            key={loc.id}
            // Mengarahkan ke ID unik dari database
            href={`/registrasi-aset/${loc.id}?name=${loc.name}`}
            className="group p-6 bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-primary transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              {/* Ikon Map Pin */}
              <div className="w-12 h-12 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488]">
                <MapPin size={24} />
              </div>
              
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-primary transition-colors uppercase">
                  {loc.name}
                </span>
                <span className="text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
                   Klik untuk lihat daftar aset
                </span>
              </div>
            </div>
            
            <ChevronRight className="text-[#94A3B8] group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}