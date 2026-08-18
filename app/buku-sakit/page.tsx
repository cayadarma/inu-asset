import React from "react";
import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

export default function BukuSakitPage() {
  // Data lokasi disesuaikan dengan Figma Anda
  const locations = [
    { id: "lagoon", name: "LAGOON", active: 234, maintenance: 234, repair: 6, broken: 0 },
    { id: "lps-1", name: "LPS 1", active: 234, maintenance: 234, repair: 6, broken: 0 },
    { id: "lps-2", name: "LPS 2", active: 234, maintenance: 234, repair: 6, broken: 0 },
    { id: "lps-3", name: "LPS 3", active: 234, maintenance: 234, repair: 6, broken: 0 },
    { id: "lps-4", name: "LPS 4", active: 234, maintenance: 234, repair: 6, broken: 0 },
    { id: "lps-5", name: "LPS 5", active: 234, maintenance: 234, repair: 6, broken: 0 },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-[1200px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Buku Sakit</h1>
        <p className="text-[#94A3B8] text-sm">Pilih lokasi untuk melihat riwayat serta laporan kerusakan aset yang aktif</p>
      </div>

      {/* List Lokasi */}
      <div className="flex flex-col gap-5">
        {locations.map((loc) => (
          <Link 
            key={loc.id}
            href={`/buku-sakit/${loc.id}`}
            className="group p-6 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-[0px_4px_6px_rgba(0,0,0,0.02)] hover:border-primary transition-all flex items-center justify-between"
          >
            <div className="flex items-start gap-6">
              {/* Ikon Kiri */}
              <div className="w-12 h-12 bg-[#CCFBF1] rounded-lg flex items-center justify-center text-[#0D9488] flex-shrink-0">
                <MapPin size={24} />
              </div>

              {/* Konten Tengah: Nama & 4 Status */}
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{loc.name}</h3>
                
                {/* Grid Status (2 Kolom) */}
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  {/* Kolom 1 */}
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 bg-[#D1FAE5] text-[#065F46] text-[12px] font-bold rounded-full w-fit">
                      {loc.active} aset beroperasi
                    </span>
                    <span className="px-3 py-1 bg-[#FEF3C7] text-[#EF4444] text-[12px] font-bold rounded-full w-fit">
                      {loc.repair} aset dalam perbaikan
                    </span>
                  </div>
                  
                  {/* Kolom 2 */}
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 bg-[#FFF7D6] text-[#E28E00] text-[12px] font-bold rounded-full w-fit">
                      {loc.maintenance} aset dalam pemeliharaan
                    </span>
                    <span className="px-3 py-1 bg-[#FEE2E2] text-[#991B1B] text-[12px] font-bold rounded-full w-fit">
                      {loc.broken} aset rusak
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panah Kanan */}
            <div className="text-[#94A3B8] group-hover:text-primary transition-all">
              <ChevronRight size={20} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}