import React from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import InteractiveChecklist from "@/components/maintenance/InteractiveChecklist"; // Import baru

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 pb-10">

      <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Checklist Pemeliharaan Preventif</h1>

      {/* Info Aset Tetap Sama */}
      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Genset Caterpillar 3516</h2>
          <div className="flex flex-wrap gap-4 text-sm text-[#475569] dark:text-[#94A3B8]">
            <span>Kode: <span className="font-bold">AST-001</span></span>
            <span>Lokasi: <span className="font-bold">Lagoon</span></span>
          </div>
        </div>
        <div className="w-full md:w-64">
           <div className="flex justify-between text-sm mb-2">
             <span className="font-bold">Progres</span>
             <span className="font-bold text-[#0D9488]">65%</span>
           </div>
           <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-[#0D9488] w-[65%]"></div>
           </div>
        </div>
      </div>

      {/* PAKAI KOMPONEN INTERAKTIF DI SINI */}
      <InteractiveChecklist 
        title="Pemeriksaan Mesin"
        initialTasks={[
          { task: "Cek level oli mesin & tambah jika perlu", tech: "Budi Santoso", note: "Kondisi oli bersih, volume cukup", status: "Selesai" },
          { task: "Periksa filter udara & bersihkan", tech: "Budi Santoso", note: "Saringan udara berdebu ringan", status: "Selesai" },
          { task: "Cek tegangan belt radiator", tech: "Hendra Setiawan", note: "Ketegangan pas, tidak ada retak", status: "Selesai" },
        ]}
      />

      <InteractiveChecklist 
        title="Pemeriksaan Sistem Pendingin"
        initialTasks={[
          { task: "Cek level coolant radiator", tech: "Budi Santoso", note: "Coolant berada di batas minimum", status: "Berlangsung" },
          { task: "Periksa kebocoran selang radiator", tech: "Hendra Setiawan", note: "Menunggu klem baru", status: "Berlangsung" },
        ]}
      />
    </div>
  );
}