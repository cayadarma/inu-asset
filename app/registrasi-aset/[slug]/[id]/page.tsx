"use client";

import React, { useState, use } from "react";
import { ChevronLeft, Edit3, Trash2, Calendar, MapPin, Tag, Image as ImageIcon, ChevronDown } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function AssetDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  // 1. Ambil slug dan id dari URL
  const { slug, id } = use(params);
  const locationName = slug.replace("-", " ").toUpperCase();

  // 2. State untuk interaksi
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pemeliharaan" | "kerusakan">("pemeliharaan");

  // 3. Mock Data Utama
  const asset = {
    id: id,
    name: "Genset Caterpillar 3516",
    type: "Generator",
    spec: "2000 kVA, Diesel Engine",
    purchaseDate: "2019-03-15",
    age: "5 tahun 4 bulan",
    location: locationName,
    status: "Beroperasi",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800"
  };

  // 4. Dummy Data Riwayat Sesuai Gambar Inspirasi
  const maintenanceHistory = [
    { title: "Overhaul sistem pendingin & filter oli", date: "12 Juni 2024", tech: "Suryadi", targetId: "1" },
    { title: "Kalibrasi alternator output", date: "15 April 2024", tech: "Ahmad Dani", targetId: "2" },
    { title: "Inspeksi rutin & penggantian busi kawat", date: "10 Januari 2024", tech: "Suryadi", targetId: "3" },
  ];

  const damageHistory = [
    { title: "Oli bocor", date: "12 Juni 2024 s.d 10 Agustus 2024", tech: "Suryadi", targetId: "WO-24-0042" },
    { title: "Mesin overheat", date: "15 April 2024 s.d 20 April 2024", tech: "Riondhera", targetId: "WO-24-0043" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* KOLOM KIRI: VISUAL & AKSI */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm">
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
               <img src={asset.image} alt="Asset" className="w-full h-full object-cover" />
            </div>
            <div className="mt-4 flex justify-between items-center px-2">
              <span className="text-sm font-bold text-[#475569] dark:text-[#94A3B8]">Status Sekarang:</span>
              <Badge status={asset.status} />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all"
            >
              <Edit3 size={18} /> Edit Aset
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-all">
              <Trash2 size={18} /> Hapus Aset
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: INFO UTAMA & TAB RIWAYAT */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Card Info Utama */}
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-8">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Informasi Utama Aset</h2>
            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
               <DetailItem label="Kode Aset" val={asset.id} />
               <DetailItem label="Nama Aset" val={asset.name} />
               <DetailItem label="Tipe Aset" val={asset.type} />
               <DetailItem label="Spesifikasi" val={asset.spec} />
               <DetailItem label="Tanggal Pembelian" val="15 Maret 2019" />
               <DetailItem label="Usia Aset" val={asset.age} />
               <DetailItem label="Lokasi" val={asset.location} />
            </div>
          </div>

          {/* Card Tab Riwayat (Poin 4, 5, 6) */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
            <div className="flex border-b bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A]">
              <button 
                onClick={() => setActiveTab("pemeliharaan")}
                className={`px-8 py-5 text-sm font-bold transition-all ${activeTab === "pemeliharaan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white dark:bg-[#1E293B]" : "text-[#94A3B8] hover:text-[#475569] dark:text-[#94A3B8]"}`}
              >
                Riwayat Pemeliharaan
              </button>
              <button 
                onClick={() => setActiveTab("kerusakan")}
                className={`px-8 py-5 text-sm font-bold transition-all ${activeTab === "kerusakan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white dark:bg-[#1E293B]" : "text-[#94A3B8] hover:text-[#475569] dark:text-[#94A3B8]"}`}
              >
                Riwayat Kerusakan
              </button>
            </div>
            
            <div className="flex flex-col">
               {activeTab === 'pemeliharaan' ? (
                 maintenanceHistory.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50/50 transition-all group">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]text-[15px] group-hover:text-primary transition-colors">{item.title}</span>
                          <span className="text-xs text-[#94A3B8] font-medium">{item.date}  •  Teknisi: {item.tech}</span>
                       </div>
                       {/* Poin 5: Link ke Halaman Pemeliharaan Pencegahan */}
                       <Link 
                        href={`/pemeliharaan/checklist/${item.targetId}`}
                        className="px-5 py-2 bg-[#96BEFF] text-[#0932B6] rounded-lg font-bold text-[12px] hover:bg-[#0932B6] hover:text-white transition-all shadow-sm"
                       >
                         Lihat Detail
                       </Link>
                    </div>
                 ))
               ) : (
                 damageHistory.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50/50 transition-all group">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]text-[15px] group-hover:text-primary transition-colors">{item.title}</span>
                          <span className="text-xs text-[#94A3B8] font-medium">{item.date}  •  Teknisi: {item.tech}</span>
                       </div>
                       {/* Poin 6: Link ke Halaman Detail Work Order (Korektif) */}
                       <Link 
                        href={`/pemeliharaan/korektif/${item.targetId}`}
                        className="px-5 py-2 bg-[#96BEFF] text-[#0932B6] rounded-lg font-bold text-[12px] hover:bg-[#0932B6] hover:text-white transition-all shadow-sm"
                       >
                         Lihat Detail
                       </Link>
                    </div>
                 ))
               )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT ASET (POIN 3) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Informasi Utama Aset">
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-5">
             <EditField label="Kode Aset" val={asset.id} />
             <EditField label="Nama Aset" val={asset.name} />
             <EditField label="Tipe Aset" val={asset.type} />
             <EditField label="Spesifikasi" val={asset.spec} />
             <EditField label="Tanggal Pembelian Aset" val={asset.purchaseDate} type="date" />
             <EditField label="Umur Aset" val={asset.age} disabled />
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Lokasi Aset</label>
                <div className="relative">
                  <select className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary cursor-pointer font-bold">
                    <option>{asset.location}</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
             </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5">
             <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Foto Aset</label>
             <div className="w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] shadow-inner">
                <img src={asset.image} alt="Preview" className="w-full h-full object-cover" />
             </div>
             <button type="button" className="w-fit px-4 py-2 bg-[#F1F5F9] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-200 transition-all">Pilih foto</button>
             <div className="flex flex-col gap-3 mt-auto pt-10">
                <button type="submit" className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">Simpan Aset</button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm shadow-md">Batalkan</button>
             </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Komponen Helper
function DetailItem({ label, val }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">{label}</span>
      <span className="text-[15px] font-bold text-[#0F172A] dark:text-[#F8FAFC]">{val}</span>
    </div>
  );
}

function EditField({ label, val, type = "text", disabled = false }: any) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{label}</label>
      <input 
        type={type} 
        defaultValue={val} 
        disabled={disabled} 
        className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] text-[#94A3B8]' : 'bg-white dark:bg-[#1E293B] font-bold text-[#0F172A] dark:text-[#F8FAFC]'}`} 
      />
    </div>
  );
}