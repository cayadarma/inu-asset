"use client";

import React, { useState } from "react";
import { Plus, Search, ChevronDown, Eye, Pencil, Calendar, User, Briefcase, DollarSign, ImageIcon } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function CorrectiveMaintenancePage() {
  // State untuk Modal (Memastikan Poin 2 Terjawab)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState("");

  const workOrders = [
  { id: "WO-24-0042", tgl: "21 Jan 2026", asset: "Agitator Alum (MA.01)", trouble: "Batang Baling-baling patah", oleh: "Veri Guna", progress: 60, ket: "Proses pengerjaan" },
  { id: "WO-24-0043", tgl: "24 Jan 2026", asset: "Pompa Sirkulasi (PS.02)", trouble: "Selang sirkulasi bocor", oleh: "Yan Adi Guna", progress: 100, ket: "Sudah beroperasi normal" },
  { id: "WO-24-0044", tgl: "27 Jan 2026", asset: "Agitator Alum (MA.01)", trouble: "Baling-baling patah", oleh: "Sujana Edo", progress: 100, ket: "Sudah beroperasi normal" },
  { id: "WO-24-0045", tgl: "30 Jan 2026", asset: "Pompa Sirkulasi (PS.02)", trouble: "Selang sirkulasi bocor", oleh: "Veri Guna", progress: 60, ket: "Proses pengerjaan" },
  ];
  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left">
      
      {/* 1. HEADER & TAB SWITCHER (DISESUAIKAN PERSIS PENCEGAHAN) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Pemeliharaan Korektif</h1>
          <p className="text-[#475569] text-sm font-medium">Kelola tiket perbaikan dan Work Order aset secara reaktif</p>
        </div>
        
        <div className="flex bg-[#E2E8F0] p-1 rounded-xl">
          <Link 
            href="/pemeliharaan" 
            className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors"
          >
            Pemeliharaan Pencegahan
          </Link>
          <button 
            className="px-6 py-2 bg-white rounded-lg text-sm font-bold text-[#0F172A] shadow-sm"
          >
            Pemeliharaan Korektif
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatItem label="Total Work Order" val="45" desc="Semua pelaporan korektif" color="text-[#0F172A]" />
        <StatItem label="Dalam Proses" val="12" desc="Sedang dikerjakan tim teknis" color="text-[#3B82F6]" />
        <StatItem label="Menunggu Sparepart" val="5" desc="Suku cadang sedang dipesan" color="text-[#F59E0B]" />
        <StatItem label="Selesai" val="28" desc="Selesai diperbaiki" color="text-[#10B981]" />
      </div>

      {/* 3. FILTER BAR & TOMBOL BUAT WO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input type="text" placeholder="Cari Work Order..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary bg-white" />
          </div>
          <FilterSelect label="Prioritas" />
          <FilterSelect label="Status" />
          <FilterSelect label="Lokasi" />
        </div>
        
        {/* TOMBOL BUAT WO (DIPASTIKAN BISA DIPENCET) */}
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 transition-all shadow-md active:scale-95"
        >
          <Plus size={18} /> Buat Work Order
        </button>
      </div>

      {/* 4. TABEL WORK ORDER (TANPA PROGRESS) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#F8FAFC] border-b text-[#475569] font-bold">
              <tr>
                <th className="px-6 py-4 uppercase">No</th>
                <th className="px-6 py-4 uppercase">Tgl</th>
                <th className="px-6 py-4 uppercase">Aset (KODE)</th>
                <th className="px-6 py-4 uppercase">Jenis Barang</th> 
                <th className="px-6 py-4 uppercase">Masalah (TROUBLE)</th>
                <th className="px-6 py-4 uppercase">Teknisi (OLEH)</th>
                <th className="px-6 py-4 uppercase text-center">Keterangan (KET)</th>
                <th className="px-6 py-4 uppercase text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrders.map((wo, index) => (
                <tr key={wo.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5 text-[#94A3B8]">{index + 1}</td>
                  <td className="px-6 py-5 text-[#475569] whitespace-nowrap">{wo.tgl}</td>
                  <td className="px-6 py-5 font-bold text-[#0F172A]">{wo.asset.split('(')[1].replace(')', '')}</td>
                  <td className="px-6 py-5 text-[#475569]">{wo.asset.split('(')[0]}</td>
                  <td className="px-6 py-5 text-[#475569] italic truncate max-w-[200px]">"{wo.trouble}"</td>
                  <td className="px-6 py-5 text-[#475569] font-medium">{wo.oleh}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      wo.ket.includes('normal') ? 'bg-green-50 text-[#10B981]' : 'bg-orange-50 text-[#F59E0B]'
                    }`}>
                      {wo.ket}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-3">
                      <Link href={`/pemeliharaan/korektif/${wo.id}`} className="text-[#64748B] hover:text-[#0D9488]"><Eye size={18} /></Link>
                      <button onClick={() => setIsEditModalOpen(true)} className="text-[#64748B] hover:text-[#0F172A]"><Pencil size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL BUAT WORK ORDER */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Penerbitan Work Order Baru">
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          {/* KIRI: INFO ASET & TEKNIS (lg:col-span-2) */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Pilih Aset Bermasalah</label>
                <select className="p-3 border border-gray-200 rounded-xl bg-[#F8FAFC] text-sm font-bold outline-none focus:border-primary">
                  <option>MA.01 - Agitator Alum</option>
                  <option>PS.02 - Pompa Sirkulasi</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Tugaskan Teknisi (OLEH)</label>
                <select className="p-3 border border-gray-200 rounded-xl bg-white text-sm font-bold outline-none focus:border-primary">
                  <option>Veri Guna</option>
                  <option>Budi Santoso</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Masalah Utama (TROUBLE)</label>
              <input type="text" placeholder="Contoh: Batang pengaduk patah" className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Instruksi Awal / Keterangan</label>
              <textarea rows={3} placeholder="Jelaskan detail perbaikan yang diminta..." className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"></textarea>
            </div>
          </div>

          {/* KANAN: BIAYA & PRIORITAS (lg:col-span-1) */}
          <div className="lg:col-span-1 flex flex-col gap-6 bg-[#F8FAFC] p-6 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-[#0F172A] text-sm border-b pb-2 uppercase tracking-widest">Estimasi & Urgensi</h4>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Prioritas</label>
                <select className="p-2.5 border border-gray-200 rounded-lg text-sm font-black text-red-600 outline-none">
                  <option>TINGGI</option>
                  <option>SEDANG</option>
                  <option>RENDAH</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Estimasi Biaya Part (Rp)</label>
                <input type="number" placeholder="0" className="p-2.5 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-primary" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Estimasi Biaya Jasa (Rp)</label>
                <input type="number" placeholder="0" className="p-2.5 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-4">
              <button type="submit" className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700">Terbitkan WO</button>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full text-[#475569] text-sm font-bold hover:underline">Batalkan</button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={`Update Progress Perbaikan — ${selectedWO}`}
      >
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          {/* KIRI: DATA TEKNIS (lg:col-span-2) */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            
            {/* Baris 1: Tanggal & Pelaksana (Oleh) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Tanggal Perbaikan (TGL)</label>
                <input type="date" className="p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-primary font-medium" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Teknisi Pelaksana (OLEH)</label>
                <input type="text" placeholder="Nama teknisi yang mengerjakan" className="p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-primary" />
              </div>
            </div>

            {/* Baris 2: Masalah (Trouble) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Deskripsi Masalah (TROUBLE)</label>
              <textarea rows={2} placeholder="Keluhan atau kerusakan yang ditemukan..." className="p-3 border border-gray-200 rounded-xl bg-[#F8FAFC] text-sm outline-none focus:border-primary"></textarea>
            </div>

            {/* Baris 3: Tindakan (Tindak Lanjut) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Tindakan Perbaikan (TINDAK LANJUT)</label>
              <textarea rows={3} placeholder="Apa saja yang sudah diperbaiki/diganti?" className="p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-primary font-medium"></textarea>
            </div>

            {/* Baris 4: Pengawas & Keterangan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Nama Pengawas (PENGAWAS)</label>
                <input type="text" placeholder="Nama supervisor" className="p-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Status Akhir (KET)</label>
                <select className="p-3 border border-gray-200 rounded-xl bg-white text-sm font-bold outline-none focus:border-primary">
                  <option>Sudah beroperasi normal</option>
                  <option>Minimalisir kebocoran</option>
                  <option>Menunggu penggantian part</option>
                  <option>Proses pengerjaan</option>
                </select>
              </div>
            </div>
          </div>

          {/* KANAN: BUKTI FOTO & TOMBOL SIMPAN */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <label className="text-sm font-bold text-[#0F172A]">Foto Pekerjaan (FOTO)</label>
            <div className="w-full aspect-square bg-[#D6DEE6] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 shadow-inner">
              <ImageIcon size={48} className="text-[#94A3B8]" />
              <span className="text-xs font-bold text-[#94A3B8]">Ambil Foto Perbaikan</span>
            </div>
            <input type="file" className="text-xs text-secondary" />

            <div className="flex flex-col gap-3 mt-auto pt-6">
              <button type="submit" className="w-full bg-[#0D9488] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">
                Simpan Update Progress
              </button>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full bg-white border border-gray-200 text-[#475569] py-4 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">
                Batalkan
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- SUB COMPONENTS ---

function StatItem({ label, val, desc, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1">
      <span className="text-[13px] text-[#94A3B8] font-medium">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{val}</span>
      <span className="text-[11px] text-[#94A3B8] mt-1">{desc}</span>
    </div>
  );
}

function FilterSelect({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#475569] font-bold cursor-pointer hover:border-primary transition-all shadow-sm">
      <span>{label}</span>
      <ChevronDown size={16} className="text-[#94A3B8]" />
    </div>
  );
}

function BadgeWO({ status }: { status: string }) {
  const styles: any = {
    "Dalam Proses": "bg-[#DBEAFE] text-[#1E40AF]",
    "Menunggu Part": "bg-[#FEF3C7] text-[#92400E]",
    "Selesai": "bg-[#D1FAE5] text-[#065F46]",
    "Baru": "bg-[#F1F5F9] text-[#475569]",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${styles[status] || styles["Baru"]}`}>
      {status}
    </span>
  );
}