"use client";

import React, { use } from "react";
import Link from "next/link";
import { ChevronLeft, Printer, CheckCircle2, Clock, MapPin, Wrench, User, Calendar, FileText } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* 1. BREADCRUMBS */}
      <div className="flex items-center gap-2 text-[13px] text-[#94A3B8]">
        <span>INU Asset</span>
        <span>/</span>
        <Link href="/pemeliharaan" className="hover:text-primary">Pemeliharaan</Link>
        <span>/</span>
        <Link href="/pemeliharaan/korektif" className="hover:text-primary">Pemeliharaan Korektif</Link>
        <span>/</span>
        <span className="text-[#0F172A] font-bold">{id}</span>
      </div>

      {/* 2. HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#0F172A]">Detail Work Order — {id}</h1>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-[#FEE2E2] text-[#991B1B] text-[11px] font-bold rounded-full">Tinggi</span>
            <span className="px-3 py-1 bg-[#DBEAFE] text-[#1E40AF] text-[11px] font-bold rounded-full">Dalam Proses</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-[#475569] hover:bg-gray-50 transition-all">
            <Printer size={18} /> Cetak WO
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0D9488] text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-md transition-all">
            Selesaikan Perbaikan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI (KONTEN UTAMA) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Card: Informasi Masalah */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] text-lg">Informasi Masalah & Pelaporan</h3>
            <div className="flex flex-col gap-4">
              <RowItem label="Aset" value="Pompa Air Grundfos CR 32" />
              <RowItem label="Lokasi" value="Power Plant - Area Utility Utama" />
              <RowItem label="Pelapor" value="Ahmad Suripto (Operator Shift A)" />
              <RowItem label="Tanggal Laporan" value="5 Juli 2024, 08:30 WIB" />
              <div className="h-[1px] bg-gray-100 my-2"></div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-[#94A3B8]">Deskripsi Masalah</span>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Pompa air mengalami kenaikan temperatur yang tidak biasa (overheating) mencapai 85°C dalam waktu 15 menit operasional, disertai dengan getaran berlebih di area bearing utama. Tercium bau hangus terbakar. Pompa telah dimatikan secara manual untuk mencegah kerusakan lebih parah.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Progres */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] text-lg">Perkembangan Perbaikan (Progress)</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#475569]">Tahap pengerjaan perbaikan</span>
                <span className="text-sm font-black text-[#0D9488]">60% Selesai</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0D9488] w-[60%] rounded-full shadow-[0_0_8px_rgba(13,148,136,0.3)]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (SIDEBAR INFO) */}
        <div className="flex flex-col gap-6">
          
          {/* Card: Eksekusi & Biaya */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] text-lg">Eksekusi & Biaya</h3>
            <div className="flex flex-col gap-4">
              <SideRow label="Teknisi Utama" value="Budi Santoso" />
              <SideRow label="Tanggal Mulai" value="6 Juli 2024" />
              <SideRow label="Estimasi Selesai" value="10 Juli 2024" />
              <SideRow label="Biaya Suku Cadang" value="Rp 8.500.000" />
              <SideRow label="Biaya Jasa" value="Rp 4.000.000" />
              <div className="h-[1px] bg-gray-100 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#0F172A]">Total Biaya Estimasi</span>
                <span className="text-lg font-black text-[#0D9488]">Rp 12.500.000</span>
              </div>
            </div>
          </div>

          {/* Card: Aktivitas & Log */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] text-lg">Aktivitas & Log WO</h3>
            <div className="flex flex-col gap-8 relative">
              {/* Garis Vertikal Timeline */}
              <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-gray-100"></div>

              <LogItem 
                time="6 Juli, 09:00" 
                title="Perbaikan Dimulai" 
                desc="Teknisi membongkar casing pompa dan memeriksa rotor." 
                active 
              />
              <LogItem 
                time="5 Juli, 14:00" 
                title="Suku Cadang Disetujui" 
                desc="Pembelian bearing dan seal disetujui manajemen." 
              />
              <LogItem 
                time="5 Juli, 08:30" 
                title="Pelaporan Masalah" 
                desc="Overheating dilaporkan oleh Ahmad Suripto." 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Komponen Helper: Row Item untuk Kolom Kiri
function RowItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-start items-center py-1">
      <span className="w-40 text-sm text-[#94A3B8] font-medium">{label}</span>
      <span className="text-sm text-[#0F172A] font-semibold">{value}</span>
    </div>
  );
}

// Komponen Helper: Row Item untuk Kolom Kanan
function SideRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#475569]">{label}</span>
      <span className="text-sm font-black text-[#0F172A]">{value}</span>
    </div>
  );
}

// Komponen Helper: Item Timeline Log
function LogItem({ time, title, desc, active = false }: { time: string, title: string, desc: string, active?: boolean }) {
  return (
    <div className="flex gap-4 relative z-10">
      <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${active ? 'bg-[#0D9488] ring-4 ring-teal-50' : 'bg-gray-300'}`}></div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-[#94A3B8]">{time}</span>
        <span className="text-sm font-bold text-[#0F172A]">{title}</span>
        <p className="text-[13px] text-[#64748B] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}