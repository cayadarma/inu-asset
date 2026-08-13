"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, MessageSquare, Wrench, User, Calendar } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function BukuSakitDetailPage({ params }: { params: Promise<{ slug: string, id: string }> }) {
  const { slug, id } = use(params);
  
  // State untuk Tab dan Modal
  const [activeTab, setActiveTab] = useState<"gangguan" | "pemeliharaan">("gangguan");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header Breadcrumbs */}
      <div className="flex items-center gap-2 text-[14px]">
        <Link href="/buku-sakit" className="text-[#94A3B8] hover:text-primary transition-colors">Buku Sakit</Link>
        <span className="text-[#94A3B8]">/</span>
        <Link href={`/buku-sakit/${slug}`} className="text-[#475569] font-medium capitalize hover:text-primary">{slug}</Link>
        <span className="text-[#94A3B8]">/</span>
        <span className="text-[#0F172A] font-bold">Detail Kerusakan</span>
      </div>

      {/* Info Utama Aset (Header) */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#F1F5F9] rounded-xl overflow-hidden border border-gray-100">
                <img src="https://placehold.co/80x80?text=ASSET" alt="Asset" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[#0F172A]">Genset Caterpillar 3516</h1>
                    <Badge status="Rusak" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#475569]">
                    <span className="flex items-center gap-1.5"><Badge status="AST-001" /></span>
                    <span className="text-gray-300">|</span>
                    <span>Tipe: Generator</span>
                    <span className="text-gray-300">|</span>
                    <span>Lokasi: {slug.toUpperCase()}</span>
                </div>
            </div>
        </div>
        <Link href={`/registrasi-aset/${slug}/${id}`} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-[#475569] hover:bg-gray-50 transition-all">
            Lihat Profil Aset
        </Link>
      </div>

      {/* Konten Record Table (Poin 7 & 8) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab Menu & Button */}
        <div className="px-6 bg-[#F8FAFC] border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex w-full md:w-auto">
            <button 
              onClick={() => setActiveTab("gangguan")}
              className={`px-6 py-4 text-sm font-bold transition-all ${activeTab === "gangguan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white" : "text-[#94A3B8] hover:text-[#475569]"}`}
            >
              Record Gangguan (Buku Sakit)
            </button>
            <button 
              onClick={() => setActiveTab("pemeliharaan")}
              className={`px-6 py-4 text-sm font-bold transition-all ${activeTab === "pemeliharaan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white" : "text-[#94A3B8] hover:text-[#475569]"}`}
            >
              Record Pemeliharaan
            </button>
          </div>
          
          {/* Poin 7: Tombol Tambah Record hanya muncul di tab gangguan */}
          {activeTab === "gangguan" && (
            <button 
                onClick={() => setIsRecordModalOpen(true)}
                className="mb-4 md:mb-0 flex items-center gap-2 bg-[#0D9488] text-white px-4 py-2.5 rounded-xl text-[13px] font-bold shadow-md hover:opacity-90 transition-all"
            >
                <Plus size={18} /> Tambah Record Gangguan
            </button>
          )}
        </div>
        
        <div className="p-0">
          {activeTab === "gangguan" ? (
            <div className="overflow-x-auto animate-in fade-in duration-300">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F1F5F9] border-b text-[#475569] font-bold">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Masalah/Gangguan</th>
                    <th className="px-6 py-4">Deskripsi & Resolusi</th>
                    <th className="px-6 py-4">Pelapor</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-[#475569]">04 Juli 2024</td>
                    <td className="px-6 py-4 font-bold text-[#0F172A]">Kebocoran Radiator</td>
                    <td className="px-6 py-4 max-w-[350px]">
                      <p className="text-[#475569]">Tetesan coolant terdeteksi di bagian tangki penampung cadangan.</p>
                      <p className="text-[#0D9488] font-bold mt-1 text-[12px]">Resolusi: Penggantian klem selang</p>
                    </td>
                    <td className="px-6 py-4 text-[#475569]">Suryadi</td>
                    <td className="px-6 py-4"><Badge status="Pemeliharaan" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center flex flex-col items-center gap-3 animate-in fade-in duration-300">
               <div className="p-4 bg-gray-50 rounded-full text-gray-300"><Wrench size={40} /></div>
               <p className="text-secondary font-medium">Belum ada record pemeliharaan untuk aset ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Poin 7: Modal Tambah Record Gangguan */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Tambah Laporan Gangguan">
        <form className="flex flex-col gap-5">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                 <label className="text-xs font-bold text-secondary uppercase">Tanggal Kejadian</label>
                 <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="date" className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm" />
                 </div>
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-xs font-bold text-secondary uppercase">Pelapor</label>
                 <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="Nama pelapor" className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm" />
                 </div>
              </div>
           </div>
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase">Judul Masalah/Gangguan</label>
              <input type="text" placeholder="Contoh: Mesin Overheat / Kebocoran Oli" className="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm" />
           </div>
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase">Deskripsi Detail</label>
              <textarea rows={4} placeholder="Jelaskan kronologi atau gejala kerusakan..." className="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm"></textarea>
           </div>
           <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsRecordModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-[#475569] hover:bg-gray-50 transition-all">Batal</button>
              <button type="submit" className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-md">Laporkan Kerusakan</button>
           </div>
        </form>
      </Modal>
    </div>
  );
}