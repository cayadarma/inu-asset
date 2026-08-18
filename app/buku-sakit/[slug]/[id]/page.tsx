"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Wrench, User, Calendar, Image as LucideImage, Eye } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function BukuSakitDetailPage({ params }: { params: Promise<{ slug: string, id: string }> }) {
  const { slug, id } = use(params);
  
  // --- SEMUA STATE HARUS DI SINI (DI ATAS) ---
  const [activeTab, setActiveTab] = useState<"gangguan" | "pemeliharaan">("gangguan");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isViewDetailOpen, setIsViewDetailOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">

      {/* 2. INFO HEADER ASET */}
      <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#F1F5F9] rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center text-gray-400 font-bold">
                ASSET
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[#0F172A]">Genset Caterpillar 3516</h1>
                    <Badge status="Rusak" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#475569]">
                    <span className="font-bold text-[#0F172A]">{id}</span>
                    <span className="text-gray-300">|</span>
                    <span>Tipe: Generator</span>
                    <span className="text-gray-300">|</span>
                    <span className="capitalize">Lokasi: {slug}</span>
                </div>
            </div>
        </div>
        <Link href={`/registrasi-aset/${slug}/${id}`} className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-bold text-[#475569] hover:bg-gray-50 transition-all">
            Lihat Profil Aset
        </Link>
      </div>

      {/* 3. TABEL & TAB MENU */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 bg-[#F8FAFC] border-b border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <div className="flex w-full md:w-auto">
            <button 
              onClick={() => setActiveTab("gangguan")}
              className={`px-6 py-5 text-sm font-bold transition-all ${activeTab === "gangguan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white" : "text-[#94A3B8] hover:text-[#475569]"}`}
            >
              Record Gangguan (Buku Sakit)
            </button>
            <button 
              onClick={() => setActiveTab("pemeliharaan")}
              className={`px-6 py-5 text-sm font-bold transition-all ${activeTab === "pemeliharaan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white" : "text-[#94A3B8] hover:text-[#475569]"}`}
            >
              Record Pemeliharaan
            </button>
          </div>
          
          {activeTab === "gangguan" && (
            <button 
                onClick={() => setIsRecordModalOpen(true)}
                className="my-3 md:my-0 flex items-center gap-2 bg-[#0D9488] text-white px-4 py-2.5 rounded-xl text-[13px] font-bold shadow-md hover:bg-teal-700 transition-all"
            >
                <Plus size={18} /> Tambah Record Gangguan
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          {activeTab === "gangguan" ? (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#F1F5F9] border-b text-[#475569] font-bold uppercase text-[11px] tracking-widest">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Masalah</th>
                  <th className="px-6 py-4">Pelapor</th>
                  <th className="px-6 py-4 text-center">Urgensi</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-[#475569] font-medium">04 Juli 2024</td>
                  <td className="px-6 py-5 font-bold text-[#0F172A]">Kebocoran Radiator</td>
                  <td className="px-6 py-5 text-[#475569] font-medium">Suryadi</td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded uppercase">Berat</span>
                  </td>
                  <td className="px-6 py-5 text-center"><Badge status="Pemeliharaan" /></td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => setIsViewDetailOpen(true)}
                      className="p-2 text-[#64748B] hover:text-[#0D9488] hover:bg-teal-50 rounded-lg transition-all"
                    >
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            /* ISI TAB RECORD PEMELIHARAAN (GABUNGAN PENCEGAHAN & KOREKTIF) */
            <div className="overflow-x-auto animate-in fade-in duration-300">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F8FAFC] border-b text-[#475569] font-bold uppercase text-[11px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Tipe</th>
                    <th className="px-6 py-4">Aktivitas Pemeliharaan</th>
                    <th className="px-6 py-4">Teknisi</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* DATA DUMMY GABUNGAN */}
                  {[
                    { 
                      date: "10 Juli 2024", 
                      type: "Korektif", 
                      task: "Perbaikan Kebocoran Radiator (WO-24-0042)", 
                      tech: "Budi Santoso", 
                      status: "Selesai",
                      link: "/pemeliharaan/korektif/WO-24-0042" 
                    },
                    { 
                      date: "01 Juli 2024", 
                      type: "Pencegahan", 
                      task: "Inspeksi Rutin Bulanan (PM-01)", 
                      tech: "Suryadi", 
                      status: "Selesai",
                      link: "/pemeliharaan/checklist/1" 
                    },
                    { 
                      date: "15 Juni 2024", 
                      type: "Pencegahan", 
                      task: "Overhaul Filter Oli (PM-02)", 
                      tech: "Suryadi", 
                      status: "Selesai",
                      link: "/pemeliharaan/checklist/2" 
                    },
                  ].map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-5 text-[#475569] whitespace-nowrap">{item.date}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                          item.type === 'Pencegahan' ? 'bg-[#CCFBF1] text-[#0D9488]' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-bold text-[#0F172A]">{item.task}</td>
                      <td className="px-6 py-5 text-[#475569]">{item.tech}</td>
                      <td className="px-6 py-5 text-center">
                        <Badge status={item.status} />
                      </td>
                      <td className="px-6 py-5 text-center">
                        <Link 
                          href={item.link}
                          className="px-4 py-2 bg-[#96BEFF] text-[#0932B6] rounded-lg font-bold text-[12px] hover:bg-blue-200 transition-all shadow-sm inline-block"
                        >
                          Detail Teknis
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. MODAL TAMBAH RECORD */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Laporkan Kerusakan Aset">
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Aset Terkait</label>
                <input type="text" value={`${id} - Genset Caterpillar 3516`} disabled className="p-3 border border-gray-200 rounded-xl bg-[#F8FAFC] text-sm font-bold text-[#94A3B8] cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Tingkat Urgensi</label>
                <select className="p-3 border border-gray-200 rounded-xl bg-white text-sm font-bold outline-none focus:border-primary">
                  <option>Berat (Mati Total)</option>
                  <option>Sedang (Bermasalah)</option>
                  <option>Ringan (Normal)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Nama Pelapor</label>
                <input type="text" placeholder="Masukkan nama pelapor" className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Tanggal Kejadian</label>
                <input type="date" className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Judul Masalah</label>
              <input type="text" placeholder="Contoh: Kebocoran Oli" className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A]">Kronologi Kejadian</label>
              <textarea rows={3} placeholder="Jelaskan detail kejadian..." className="p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary"></textarea>
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5">
            <label className="text-sm font-bold text-[#0F172A]">Foto Bukti</label>
            <div className="w-full aspect-square bg-[#D6DEE6] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300">
              <LucideImage size={48} className="text-[#94A3B8]" />
              <span className="text-xs font-bold text-[#94A3B8]">Upload Foto</span>
            </div>
            <button type="button" className="w-fit px-4 py-2 bg-[#F1F5F9] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569]">
                Pilih foto (.jpg, .png, .jpeg, .webp)
             </button>
            <div className="flex flex-col gap-3 mt-auto pt-6">
              <button type="submit" className="w-full bg-[#EF4444] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-all">Kirim Laporan</button>
              <button type="button" onClick={() => setIsRecordModalOpen(false)} className="w-full bg-white border border-gray-200 text-[#475569] py-4 rounded-xl font-bold text-sm">Batalkan</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL DETAIL GANGGUAN (SAAT TOMBOL MATA DIKLIK) */}
      <Modal isOpen={isViewDetailOpen} onClose={() => setIsViewDetailOpen(false)} title="Detail Laporan Gangguan">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-bold text-[#94A3B8] uppercase">Masalah</span>
              <p className="text-lg font-bold text-[#0F172A]">Kebocoran Radiator</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-[#94A3B8] uppercase">Pelapor</span>
                <p className="text-sm font-bold text-[#0F172A]">Suryadi</p>
              </div>
              <div>
                <span className="text-xs font-bold text-[#94A3B8] uppercase">Tanggal</span>
                <p className="text-sm font-bold text-[#0F172A]">04 Juli 2024</p>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-[#94A3B8] uppercase">Kronologi</span>
              <p className="text-sm text-[#475569] leading-relaxed">
                Tetesan coolant terdeteksi di bagian bawah tangki penampung saat mesin dipanaskan selama 10 menit.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-[#0F172A]">Foto Bukti</span>
            <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
              <img src="https://placehold.co/400x250?text=Foto+Kerusakan" alt="Bukti" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}