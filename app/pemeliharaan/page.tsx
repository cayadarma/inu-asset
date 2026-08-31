"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

function MaintenanceContent() {
  const [viewDate, setViewDate] = useState(new Date()); 
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- LOGIKA TAHUN LUAS (POIN 1) ---
  const startYear = 1901;
  const endYear = 2099;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const emptySlots = startDay === 0 ? 6 : startDay - 1;

  // Data Mock
  const allAgenda = [
    { id: "1", asset: "Pompa Centrifugal Ebara", loc: "LPS 3", date: 5, month: 6, year: 2024, tech: "Riondhera", status: "Terjadwal" },
    { id: "2", asset: "Genset Caterpillar 3516", loc: "Lagoon", date: 12, month: 6, year: 2024, tech: "Budi Santoso", status: "Berlangsung" },
    { id: "3", asset: "Transformator Schneider", loc: "LPS 2", date: 15, month: 6, year: 2024, tech: "Darma", status: "Terlambat" },
  ];

  const displayAgenda = selectedDay 
    ? allAgenda.filter(a => a.date === selectedDay && a.month === viewDate.getMonth() && a.year === viewDate.getFullYear())
    : allAgenda;

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pemeliharaan Pencegahan</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Monitoring jadwal pemeliharaan rutin seluruh aset</p>
        </div>
        <div className="flex bg-[#E2E8F0] dark:bg-[#334155] p-1 rounded-xl">
          <button className="px-6 py-2 bg-white dark:bg-[#1E293B] rounded-lg text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] shadow-sm">Pemeliharaan Pencegahan</button>
          <Link href="/pemeliharaan/korektif" className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A]">Pemeliharaan Korektif</Link>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* KALENDER */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
               <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pilih Tanggal</h3>
               <div className="flex gap-1">
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-[#0F172A] rounded transition-all"><ChevronLeft size={18}/></button>
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-[#0F172A] rounded transition-all"><ChevronRight size={18}/></button>
               </div>
            </div>

            {/* DROPDOWN BULAN & TAHUN (RENTANG LUAS) */}
            <div className="grid grid-cols-2 gap-2">
               <select 
                value={viewDate.getMonth()} 
                onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value)))}
                className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] rounded-xl text-xs font-bold outline-none text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer"
               >
                 {monthNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
               </select>
               <select 
                value={viewDate.getFullYear()} 
                onChange={(e) => setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth()))}
                className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] rounded-xl text-xs font-bold outline-none text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#94A3B8] uppercase">
            <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: emptySlots }).map((_, i) => <div key={`e-${i}`} className="h-10"></div>)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = selectedDay === day;
                const isToday = day === new Date().getDate() && viewDate.getMonth() === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear();

                return (
                <div 
                    key={day} 
                    onClick={() => setSelectedDay(day)}
                    className={`h-10 flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all cursor-pointer
                    ${isSelected 
                        ? 'bg-[#0D9488] text-white shadow-lg scale-105' 
                        : isToday 
                          ? 'bg-[#CCFBF1] text-[#0D9488] border border-[#0D9488]'
                          : 'bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-teal-50 dark:hover:bg-[#115E59]'
                    }`}
                >
                    {day}
                </div>
                );
            })}
          </div>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="text-[11px] font-bold text-primary dark:text-[#37BAAE] hover:underline">Tampilkan Semua Agenda</button>
          )}
        </div>

        {/* TABEL AGENDA */}
        <div className="xl:col-span-2 bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg">
              {selectedDay ? `Agenda ${selectedDay} ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}` : "Agenda Terdekat"}
            </h3>
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase">Total: {displayAgenda.length}</span>
          </div>

          <div className="overflow-x-auto">
            {displayAgenda.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b text-[#475569] dark:text-[#94A3B8] font-bold uppercase text-[11px]">
                  <tr><th className="px-4 py-4">Aset / Lokasi</th><th className="px-4 py-4">Pelaksana</th><th className="px-4 py-4 text-center">Status</th><th className="px-4 py-4 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#334155]">
                  {displayAgenda.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#0F172A]/50">
                      <td className="px-4 py-5">
                        <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.asset}</p>
                        <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 uppercase font-bold">{item.loc}</p>
                      </td>
                      <td className="px-4 py-5 text-[#475569] dark:text-[#94A3B8] font-medium">{item.tech}</td>
                      <td className="px-4 py-5 text-center"><Badge status={item.status} /></td>
                      <td className="px-4 py-5 text-center">
                        <Link href={`/pemeliharaan/checklist/${item.id}`} className="px-4 py-1.5 bg-[#CCFBF1] dark:bg-[#115E59]/30 text-[#0D9488] dark:text-[#CCFBF1] rounded-lg font-bold text-xs hover:bg-[#0D9488] hover:text-white transition-all">Detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center text-[#94A3B8] italic">Tidak ada agenda di tanggal ini.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper dengan Suspense agar tidak error saat deploy
export default function MaintenancePage() {
  return (
    <Suspense fallback={<div>Memuat...</div>}>
      <MaintenanceContent />
    </Suspense>
  );
}