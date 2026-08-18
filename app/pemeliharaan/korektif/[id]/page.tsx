"use client";

import React, { use } from "react";
import Link from "next/link";
import { ChevronLeft, Printer, Wrench, User, Calendar, Image as ImageIcon } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Detail Work Order — {id}</h1>
          <Badge status="Perbaikan" />
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-sm text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50 flex items-center gap-2">
            <Printer size={18} /> Cetak WO
          </button>
          <button className="px-5 py-2.5 bg-[#0D9488] text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-md">
            Selesaikan Perbaikan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  
        {/* KOLOM KIRI: DATA TEKNIS SPREADSHEET (LENGKAP) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]text-lg border-b pb-4">Laporan Perbaikan Teknis</h3>
            <div className="flex flex-col gap-5">
              <RowItem label="Tanggal (TGL)" value="21 Januari 2026" />
              <RowItem label="Jenis Barang" value="Agitator Alum" />
              <RowItem label="Kode Alat" value="MA.01" />
              <RowItem label="Teknisi (OLEH)" value="Veri Guna" />
              <RowItem label="Pengawas" value="Ariawan" />
              
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs font-bold text-[#94A3B8] uppercase">Masalah (TROUBLE)</span>
                <p className="text-[15px] text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]font-bold">
                  Batang Baling-baling pengaduk bahan kimia alum patah
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#94A3B8] uppercase">Tindakan (TINDAK LANJUT)</span>
                <p className="text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] p-5 rounded-xl border border-gray-100 dark:border-[#334155]">
                  Sementara diganti menggunakan flow udara kompresor untuk mengaduk bahan kimia alum. Setelah selesai dilakukan perbaikan batang baling-baling akan diganti.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-bold text-[#94A3B8] uppercase w-40">Keterangan (KET)</span>
                <div className="px-4 py-1.5 bg-green-50 text-[#10B981] rounded-lg font-black text-xs border border-green-100">
                    SUDAH BEROPERASI NORMAL KEMBALI
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* KOLOM KANAN: BUKTI FOTO */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-4">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]text-base">Bukti Foto (FOTO)</h3>
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 dark:border-[#334155]">
               {/* Gunakan gambar nyata dari spreadsheet jika ada */}
               <img src="https://placehold.co/400x400?text=Foto+Perbaikan" className="w-full h-full object-cover" />
            </div>
            <p className="text-[11px] text-[#94A3B8] text-center italic">Foto diunggah oleh Veri Guna pada 21 Jan 2026</p>
          </div>

          <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-4">
             <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]text-base">Estimasi Biaya</h3>
             <div className="flex justify-between text-sm">
                <span className="text-[#475569] dark:text-[#94A3B8]">Total Biaya</span>
                <span className="font-black text-[#0F172A] dark:text-[#F8FAFC]">Rp 12.500.000</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center">
      <span className="w-40 text-xs font-bold text-[#94A3B8] uppercase">{label}</span>
      <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]font-bold">{value}</span>
    </div>
  );
}