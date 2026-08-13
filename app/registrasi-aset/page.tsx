import React from "react";
import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

export default function RegistrasiAsetPage() {
  // Data lokasi (Mock Data)
  const locations = [
    { id: "lagoon", name: "LAGOON", count: 234 },
    { id: "lps-1", name: "LPS 1", count: 150 },
    { id: "lps-2", name: "LPS 2", count: 80 },
    { id: "lps-3", name: "LPS 3", count: 45 },
    { id: "lps-4", name: "LPS 4", count: 120 },
    { id: "lps-5", name: "LPS 5", count: 67 },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-[1000px]">
      {/* Judul */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Registrasi Aset</h1>
        <p className="text-[#475569] text-sm">Pilih lokasi untuk melihat daftar aset</p>
      </div>

      {/* List Lokasi */}
      <div className="grid grid-cols-1 gap-4">
        {locations.map((loc) => (
          <Link 
            key={loc.id}
            href={`/registrasi-aset/${loc.id}`}
            className="group p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-[#CCFBF1] rounded-lg flex items-center justify-center text-[#0D9488]">
                <MapPin size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#0F172A] group-hover:text-primary transition-colors">
                  {loc.name}
                </span>
                <span className="text-sm font-semibold text-[#64748B]">
                  {loc.count} Aset Terdaftar
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