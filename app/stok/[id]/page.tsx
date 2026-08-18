"use client";

import React, { use } from "react";
import Link from "next/link";
import { ChevronLeft, ArrowUpCircle, ArrowDownCircle, Building2, User } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const movements = [
    { date: "10 Juli 2024", type: "Keluar", qty: "-4 Unit", ref: "WO-2024-0042", note: "Pemeliharaan rutin Genset", color: "text-[#EF4444]" },
    { date: "05 Juli 2024", type: "Masuk", qty: "+15 Unit", ref: "PO-2024-0102", note: "Pembelian inventaris baru", color: "text-[#10B981]" },
    { date: "28 Juni 2024", type: "Keluar", qty: "-2 Unit", ref: "WO-2024-0038", note: "Penggantian oli berkala", color: "text-[#EF4444]" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Info Card Utama */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-[#0F172A]">Filter Oli Caterpillar 1R-0751</h2>
             <Badge status="Beroperasi" /> {/* Kita pakai badge hijau untuk 'Tersedia' */}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#64748B]">
            <span>Kode: <span className="font-bold text-[#0F172A]">{id}</span></span>
            <span>Kategori: <span className="font-bold text-[#0F172A]">Filter</span></span>
            <span>Stok Saat Ini: <span className="font-bold text-[#0D9488]">24 Unit</span></span>
          </div>
        </div>
        <button className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-[#475569] hover:bg-gray-50 transition-all">
          Sesuaikan Stok
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KIRI: Riwayat Pergerakan (Tabel) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-[#F8FAFC]">
            <h3 className="font-bold text-[#0F172A]">Riwayat Pergerakan Stok</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b text-[#94A3B8] font-bold uppercase text-[11px]">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4">Jumlah</th>
                  <th className="px-6 py-4">Referensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map((move, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-[#475569]">{move.date}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${move.type === 'Masuk' ? 'bg-green-50 text-[#10B981]' : 'bg-red-50 text-[#EF4444]'}`}>
                         {move.type}
                       </span>
                    </td>
                    <td className={`px-6 py-4 font-black ${move.color}`}>{move.qty}</td>
                    <td className="px-6 py-4">
                       <p className="font-bold text-primary text-[#0D9488]">{move.ref}</p>
                       <p className="text-[11px] text-[#94A3B8]">{move.note}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KANAN: Info Supplier */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
           <h3 className="font-bold text-[#0F172A] text-lg">Informasi Supplier</h3>
           <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                 <span className="text-[11px] text-[#94A3B8] font-bold uppercase">Nama Perusahaan</span>
                 <span className="text-[15px] font-bold text-[#0D9488] flex items-center gap-2">
                    <Building2 size={16}/> PT. Trakindo Utama
                 </span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[11px] text-[#94A3B8] font-bold uppercase">Kontak Utama</span>
                 <span className="text-[15px] font-bold text-[#0F172A] flex items-center gap-2">
                    <User size={16}/> Herman Prasetyo
                 </span>
              </div>
              <div className="pt-4 border-t border-gray-50">
                 <span className="text-[11px] text-[#94A3B8] font-bold uppercase">Alamat</span>
                 <p className="text-sm text-[#475569] mt-1 leading-relaxed italic">
                    Jl. Cilandak KKO No.1, Cilandak Timur, Jakarta Selatan, 12560
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}