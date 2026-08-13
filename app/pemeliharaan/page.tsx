import React from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  // Data Ringkasan
  const summary = [
    { label: "Total Pemeliharaan", val: "267", color: "text-[#0F172A]" },
    { label: "Terjadwal", val: "15", color: "text-[#F59E0B]" },
    { label: "Berlangsung", val: "8", color: "text-[#3B82F6]" },
    { label: "Selesai", val: "142", color: "text-[#10B981]" },
    { label: "Terlambat", val: "3", color: "text-[#EF4444]" },
  ];

  // Data Agenda Terdekat
  const agenda = [
    { id: "1", asset: "Pompa Centrifugal Ebara", loc: "LPS 3", date: "5 Juli 2024", tech: "Riondhera", status: "Terjadwal" },
    { id: "2", asset: "Genset Caterpillar 3516", loc: "Lagoon", date: "12 Juli 2024", tech: "Budi Santoso", status: "Berlangsung" },
    { id: "3", asset: "Transformator Schneider", loc: "LPS 2", date: "15 Juli 2024", tech: "Darma", status: "Terlambat" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header & Tabs Navigasi */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Pemeliharaan Pencegahan</h1>
          <p className="text-[#475569] text-sm">Ikhtisar jadwal dan rencana pemeliharaan aset perusahaan</p>
        </div>
        
        {/* Tombol Tab Switcher */}
        <div className="flex bg-[#E2E8F0] p-1 rounded-xl">
          <button className="px-6 py-2 bg-white rounded-lg text-sm font-bold text-[#0F172A] shadow-sm">
            Pemeliharaan Pencegahan
          </button>
          <Link 
            href="/pemeliharaan/korektif" 
            className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors"
          >
            Pemeliharaan Korektif
          </Link>
        </div>
      </div>

      {/* Barisan Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summary.map((item) => (
          <div key={item.label} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
            <span className="text-[13px] text-[#475569] font-medium">{item.label}</span>
            <span className={`text-2xl font-bold ${item.color}`}>{item.val}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* KIRI: Kalender Minimalis */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-[#0F172A]">Jadwal Juli 2024</h3>
            <div className="flex gap-2">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors"><ChevronLeft size={20} className="text-[#94A3B8]" /></button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors"><ChevronRight size={20} className="text-[#94A3B8]" /></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center text-[12px] font-bold text-[#94A3B8] mb-4">
            <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const isToday = day === 12;
                const hasWarning = day === 5;
                const hasDanger = day === 15;

                return (
                <div 
                    key={i} 
                    className={`h-10 flex flex-col items-center justify-center rounded-lg text-sm font-bold transition-all cursor-pointer
                    ${isToday 
                        ? 'bg-[#0D9488] text-white shadow-md' 
                        : 'bg-[#F8FAFC] text-[#0F172A] hover:bg-teal-50 hover:text-[#0D9488]'
                    }`}
                >
                    {day}
                    <div className="flex gap-0.5 mt-0.5">
                        {hasWarning && <div className="w-1 h-1 bg-[#F59E0B] rounded-full"></div>}
                        {hasDanger && <div className="w-1 h-1 bg-[#EF4444] rounded-full"></div>}
                    </div>
                </div>
                );
            })}
          </div>
        </div>

        {/* KANAN: Agenda Terdekat (Table) */}
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
          <h3 className="font-bold text-[#0F172A]">Agenda Terdekat</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b text-[#475569] font-bold">
                <tr>
                  <th className="px-4 py-4">Aset / Lokasi</th>
                  <th className="px-4 py-4">Tanggal</th>
                  <th className="px-4 py-4">Penanggung Jawab</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {agenda.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#0F172A]">{item.asset}</p>
                      <p className="text-[12px] text-[#94A3B8]">{item.loc}</p>
                    </td>
                    <td className="px-4 py-4 text-[#475569]">{item.date}</td>
                    <td className="px-4 py-4 text-[#475569]">{item.tech}</td>
                    <td className="px-4 py-4 text-center">
                       <span className={`px-3 py-1 rounded-full text-[11px] font-bold inline-block ${
                         item.status === 'Terjadwal' ? 'bg-[#FFF7D6] text-[#E28E00]' :
                         item.status === 'Berlangsung' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#FEE2E2] text-[#991B1B]'
                       }`}>
                         {item.status}
                       </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {/* Poin 9: Link ke Detail Checklist */}
                      <Link 
                        href={`/pemeliharaan/checklist/${item.id}`} 
                        className="px-4 py-1.5 bg-[#CCFBF1] text-[#0D9488] rounded-lg font-bold text-xs hover:bg-[#0D9488] hover:text-white transition-all shadow-sm"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}