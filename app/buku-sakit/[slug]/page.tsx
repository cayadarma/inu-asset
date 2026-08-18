"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Eye, Plus, ChevronDown, Calendar, User, AlertCircle, ImageIcon } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function AssetSakitListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const locationName = slug.replace("-", " ").toUpperCase();

  // State untuk Modal Lapor Kerusakan
  const [isBrokenModalOpen, setIsBrokenModalOpen] = useState(false);

  // Data aset lengkap (7 Kolom)
  const assets = [
    { id: "AST-001", name: "Genset Caterpillar 3516", type: "Generator", spec: "2000 kVA, Diesel", age: "5 tahun", status: "Beroperasi" },
    { id: "AST-002", name: "Pompa Centrifugal Ebara", type: "Pompa Air", spec: "45 kW, 3-Phase", age: "3 tahun", status: "Beroperasi" },
    { id: "AST-003", name: "Compressor Atlas Copco", type: "Kompresor", spec: "7.5 Bar, Air-Cooled", age: "2 tahun", status: "Pemeliharaan" },
    { id: "AST-004", name: "Transformator Schneider", type: "Kelistrikan", spec: "1000 kVA, Step-Down", age: "6 tahun", status: "Beroperasi" },
    { id: "AST-005", name: "Chiller York Central", type: "HVAC", spec: "150 TR, Water-Cooled", age: "4 tahun", status: "Rusak" },
    { id: "AST-006", name: "Genset Perkins 150kVA", type: "Generator", spec: "150 kVA, Silent", age: "1 tahun", status: "Beroperasi" },
    { id: "AST-007", name: "Genset Perkins 150kVA", type: "Generator", spec: "150 kVA, Silent", age: "1 tahun", status: "Perbaikan" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">
      {/* 1. HEADER DENGAN TOMBOL MERAH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Daftar Kerusakan Aset — {locationName}</h1>
          <p className="text-[#475569] text-sm font-medium">Pilih aset untuk melihat riwayat atau laporkan kerusakan baru</p>
        </div>
        {/* Tombol Merah Sesuai Permintaan */}
        <button 
          onClick={() => setIsBrokenModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#EF4444] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-md active:scale-95"
        >
          <Plus size={18} /> Tambah Kerusakan Aset
        </button>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input 
            type="text" 
            placeholder="Cari kode/nama aset..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-all"
          />
        </div>
        <FilterSelect label="Tipe Aset" />
        <FilterSelect label="Status" />
      </div>

      {/* 3. TABEL DATA LENGKAP (7 KOLOM) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[#475569] text-[13px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Kode Aset</th>
                <th className="px-6 py-4">Nama Aset</th>
                <th className="px-6 py-4">Tipe Aset</th>
                <th className="px-6 py-4">Spesifikasi</th>
                <th className="px-6 py-4">Usia Aset</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assets.map((asset, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5 text-sm font-bold text-[#0F172A]">{asset.id}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={`https://placehold.co/36x36?text=${asset.id.split('-')[1]}`} alt="" />
                      </div>
                      <span className="text-sm font-bold text-[#0F172A]">{asset.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-[#475569] font-medium">{asset.type}</td>
                  <td className="px-6 py-5 text-sm text-[#475569] font-medium">{asset.spec}</td>
                  <td className="px-6 py-5 text-sm text-[#475569] font-medium">{asset.age}</td>
                  <td className="px-6 py-5 text-center">
                    <Badge status={asset.status} />
                  </td>
                  <td className="px-6 py-5 text-center">
                    <Link 
                      href={`/buku-sakit/${slug}/${asset.id}`}
                      className="p-2 inline-block text-[#64748B] hover:text-[#0D9488] hover:bg-teal-50 rounded-lg transition-all"
                    >
                      <Eye size={20} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION FOOTER */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-[#94A3B8] font-medium">Menampilkan 1-10 dari 234 aset</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-[#475569] hover:bg-gray-50 font-bold transition-all">Sebelumnya</button>
            <button className="w-10 h-10 bg-[#0D9488] text-white rounded-lg font-bold text-sm shadow-sm">1</button>
            <button className="w-10 h-10 border border-gray-200 text-[#475569] rounded-lg font-bold text-sm hover:bg-gray-50 transition-all">2</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-[#475569] hover:bg-gray-50 font-bold transition-all">Selanjutnya</button>
          </div>
        </div>
      </div>

      {/* 5. MODAL FORM LAPOR KERUSAKAN (IDENTIK DENGAN PERMINTAAN) */}
      <Modal isOpen={isBrokenModalOpen} onClose={() => setIsBrokenModalOpen(false)} title="Laporkan Kerusakan Aset">
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          {/* KIRI: DATA TEKS */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Pilih Aset</label>
                <select className="p-3 border border-gray-200 rounded-xl bg-[#F8FAFC] text-sm font-bold outline-none focus:border-primary">
                  {assets.map(a => <option key={a.id}>{a.id} - {a.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Tingkat Urgensi</label>
                <select className="p-3 border border-gray-200 rounded-xl bg-[#F8FAFC] text-sm font-bold outline-none focus:border-primary">
                  <option>Ringan</option>
                  <option>Sedang</option>
                  <option>Berat / Fatal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Nama Pelapor</label>
                <input type="text" placeholder="Ketik nama pelapor..." className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Tanggal Kejadian</label>
                <input type="date" className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Judul Masalah</label>
              <input type="text" placeholder="Contool: Kebocoran Seal" className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Kronologi Kejadian</label>
              <textarea rows={3} placeholder="Jelaskan detail kejadian..." className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"></textarea>
            </div>
          </div>

          {/* KANAN: FOTO & KIRIM */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <label className="text-sm font-bold text-[#0F172A]">Foto Aset Rusak</label>
            <div className="w-full aspect-square bg-[#D6DEE6] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300">
              <ImageIcon size={48} className="text-[#94A3B8]" />
              <span className="text-xs font-bold text-[#94A3B8]">Upload Foto</span>
            </div>
            <button type="button" className="w-fit px-4 py-2 bg-[#F1F5F9] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569]">
                Pilih foto (.jpg, .png, .jpeg, .webp)
             </button>

            <div className="flex flex-col gap-3 mt-auto pt-6">
              <button type="submit" className="w-full bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-red-600">Kirim Laporan</button>
              <button type="button" onClick={() => setIsBrokenModalOpen(false)} className="w-full bg-white border border-gray-200 text-[#475569] py-3.5 rounded-xl font-bold text-sm">Batalkan</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Helper untuk Dropdown Filter
function FilterSelect({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#475569] font-bold cursor-pointer hover:border-primary transition-all shadow-sm">
      <span>{label}</span>
      <ChevronDown size={16} className="text-[#94A3B8]" />
    </div>
  );
}