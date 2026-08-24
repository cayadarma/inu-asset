"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, ChevronDown, Eye, Pencil, Calendar, User, Briefcase, DollarSign } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function CorrectiveMaintenancePage() {
  const searchParams = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState("");

  // State untuk Form Tambah (Mendukung data otomatis dari URL)
  const [newWO, setNewWO] = useState({
    assetId: "",
    assetName: "",
    tech: "Veri Guna",
    trouble: "",
    instruction: "",
    date: "",
    priority: "TINGGI",
    costPart: "",
    costService: ""
  });

  // --- LOGIKA OTOMATIS BUKA MODAL DARI NOTIFIKASI/DETAIL ---
  useEffect(() => {
    const shouldOpen = searchParams.get("openModal");
    const assetId = searchParams.get("assetId");
    const assetName = searchParams.get("assetName");
    const problem = searchParams.get("problem");

    if (shouldOpen === "true") {
      setIsAddModalOpen(true);
      setNewWO((prev) => ({
        ...prev,
        assetId: assetId || "",
        assetName: assetName || "",
        trouble: problem || ""
      }));
    }
  }, [searchParams]);

  const workOrders = [
    { id: "WO-24-0042", tgl: "21 Jan 2026", asset: "Agitator Alum (MA.01)", trouble: "Batang Baling-baling patah", oleh: "Veri Guna", progress: 60, ket: "Proses pengerjaan" },
    { id: "WO-24-0043", tgl: "24 Jan 2026", asset: "Pompa Sirkulasi (PS.02)", trouble: "Selang sirkulasi bocor", oleh: "Yan Adi Guna", progress: 100, ket: "Sudah beroperasi normal" },
    { id: "WO-24-0044", tgl: "27 Jan 2026", asset: "Agitator Alum (MA.01)", trouble: "Baling-baling patah", oleh: "Sujana Edo", progress: 100, ket: "Sudah beroperasi normal" },
    { id: "WO-24-0045", tgl: "30 Jan 2026", asset: "Pompa Sirkulasi (PS.02)", trouble: "Selang sirkulasi bocor", oleh: "Veri Guna", progress: 60, ket: "Proses pengerjaan" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left transition-colors duration-300">
      
      {/* 1. HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pemeliharaan Korektif</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Kelola tiket perbaikan dan Work Order aset secara reaktif</p>
        </div>
        <div className="flex bg-[#E2E8F0] dark:bg-[#334155] p-1 rounded-xl">
          <Link href="/pemeliharaan" className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]">Pemeliharaan Pencegahan</Link>
          <button className="px-6 py-2 bg-white dark:bg-[#1E293B] rounded-lg text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] shadow-sm">Pemeliharaan Korektif</button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatItem label="Total WO" val="45" color="text-[#0F172A] dark:text-[#F8FAFC]" />
        <StatItem label="Dalam Proses" val="12" color="text-[#3B82F6]" />
        <StatItem label="Mng. Sparepart" val="5" color="text-[#F59E0B]" />
        <StatItem label="Selesai" val="28" color="text-[#10B981]" />
      </div>

      {/* 3. FILTER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 w-full">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input type="text" placeholder="Cari No. WO..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm outline-none focus:border-primary bg-white dark:bg-[#1E293B] dark:text-[#F8FAFC]" />
          </div>
          <FilterSelect label="Prioritas" />
          <FilterSelect label="Status" />
          <FilterSelect label="Lokasi" />
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-md active:scale-95">
          <Plus size={18} /> Buat Work Order
        </button>
      </div>

      {/* 4. TABEL (CLEANED) */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] font-bold">
              <tr>
                <th className="px-6 py-4 uppercase">No</th>
                <th className="px-6 py-4 uppercase">Tgl</th>
                <th className="px-6 py-4 uppercase">Aset (KODE)</th>
                <th className="px-6 py-4 uppercase">Jenis Barang</th>
                <th className="px-6 py-4 uppercase">Masalah</th>
                <th className="px-6 py-4 uppercase">Teknisi (OLEH)</th>
                <th className="px-6 py-4 text-center uppercase">Keterangan</th>
                <th className="px-6 py-4 text-center uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {workOrders.map((wo, index) => (
                <tr key={wo.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0F172A]/50 transition-colors">
                  <td className="px-6 py-5 text-[#94A3B8] font-bold">{index + 1}</td>
                  <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">{wo.tgl}</td>
                  <td className="px-6 py-5 font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase">{wo.asset.split('(')[1].replace(')', '')}</td>
                  <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] font-medium">{wo.asset.split('(')[0]}</td>
                  <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] italic truncate max-w-[150px]">"{wo.trouble}"</td>
                  <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] font-bold">{wo.oleh}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${wo.ket.includes('normal') ? 'bg-green-50 text-[#10B981]' : 'bg-orange-50 text-[#F59E0B]'}`}>{wo.ket}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-3">
                      <Link href={`/pemeliharaan/korektif/${wo.id}`} className="text-[#64748B] hover:text-[#0D9488] transition-all"><Eye size={18} /></Link>
                      <button onClick={() => { setSelectedWO(wo.id); setIsEditModalOpen(true); }} className="text-[#64748B] hover:text-[#0F172A] dark:text-[#F8FAFC]"><Pencil size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL BUAT WO BARU (POIN BRAINSTORM) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Penerbitan Work Order Baru">
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Aset Bermasalah</label>
                <input type="text" value={newWO.assetName ? `${newWO.assetId} - ${newWO.assetName}` : ""} disabled placeholder="Pilih aset di bawah..." className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm font-bold text-[#94A3B8]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Tugaskan Teknisi</label>
                <select className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary">
                  <option>Veri Guna</option><option>Budi Santoso</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Masalah (TROUBLE)</label>
              <input type="text" value={newWO.trouble} onChange={(e) => setNewWO({...newWO, trouble: e.target.value})} placeholder="Contoh: Mesin Bunyi Kasar" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Instruksi Perbaikan</label>
              <textarea rows={3} placeholder="Langkah-langkah teknis..." className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white"></textarea>
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-6 bg-[#F8FAFC] dark:bg-[#0F172A] p-6 rounded-2xl border border-gray-100 dark:border-[#334155]">
            <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm border-b dark:border-[#334155] pb-2 uppercase tracking-widest">Estimasi Biaya</h4>
            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Prioritas</label>
                  <select className="p-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-black text-red-600 outline-none"><option>TINGGI</option><option>SEDANG</option></select>
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Biaya Part (Rp)</label>
                  <input type="number" placeholder="0" className="p-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold outline-none dark:bg-[#1E293B]" />
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Biaya Jasa (Rp)</label>
                  <input type="number" placeholder="0" className="p-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold outline-none dark:bg-[#1E293B]" />
               </div>
            </div>
            <div className="flex flex-col gap-3 mt-auto pt-4">
              <button type="submit" className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">Terbitkan WO</button>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-[#475569] dark:text-[#94A3B8] text-sm font-bold hover:underline">Batal</button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Update Progress — ${selectedWO}`}>
        <p className="py-10 text-center text-secondary italic">Form update teknisi sesuai spreadsheet.</p>
      </Modal>
    </div>
  );
}

function StatItem({ label, val, color }: any) {
  return (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
      <span className="text-[13px] text-[#94A3B8] font-medium">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{val}</span>
    </div>
  );
}

function FilterSelect({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] font-bold cursor-pointer hover:border-primary transition-all">
      <span>{label}</span><ChevronDown size={14} />
    </div>
  );
}