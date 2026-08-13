"use client"; // Wajib untuk interaktif modal

import React, { useState } from "react";
import { Plus, Search, FileText, Settings, X, Wrench, AlertCircle } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function CorrectiveMaintenancePage() {
  // 1. State untuk Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<string>("");

  const workOrders = [
    { id: "WO-24-0042", asset: "Pompa Air Grundfos CR 32", loc: "Power Plant", problem: "Overheating & Getaran", priority: "Tinggi", tech: "Budi Santoso", progress: 60, status: "Dalam Proses" },
    { id: "WO-24-0043", asset: "Chiller Central #1", loc: "Utility Area", problem: "Kompresor Tidak Start", priority: "Tinggi", tech: "Agus Pratama", progress: 15, status: "Menunggu Part" },
    { id: "WO-24-0044", asset: "Genset Perkins 150kVA", loc: "Workshop", problem: "Oli Bocor", priority: "Sedang", tech: "Dedi Kurniawan", progress: 100, status: "Selesai" },
  ];

  const handleEditClick = (id: string) => {
    setSelectedWO(id);
    setIsEditModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Pemeliharaan Korektif</h1>
          <p className="text-[#475569] text-sm">Kelola tiket perbaikan and Work Order aset</p>
        </div>
        <div className="flex bg-[#E2E8F0] p-1 rounded-xl">
          <Link href="/pemeliharaan" className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#0F172A]"> PemeliharaanPencegahan</Link>
          <button className="px-6 py-2 bg-white rounded-lg text-sm font-bold text-[#0F172A] shadow-sm">Pemeliharaan Korektif</button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input type="text" placeholder="Cari Work Order..." className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-gray-200 rounded-lg text-sm outline-none focus:border-primary" />
        </div>
        <button className="bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
          <Plus size={18} /> Buat WO Baru
        </button>
      </div>

      {/* Tabel Work Order */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b text-[#475569] font-bold">
              <tr>
                <th className="px-6 py-4">No. WO</th>
                <th className="px-6 py-4">Aset & Lokasi</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#0F172A]">{wo.id}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-[#0F172A]">{wo.asset}</p>
                    <p className="text-[12px] text-[#94A3B8]">{wo.loc}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${wo.priority === 'Tinggi' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{wo.priority}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 w-[100px]">
                      <span className="text-[11px] font-bold">{wo.progress}%</span>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div style={{ width: `${wo.progress}%` }} className="h-full bg-[#0D9488]"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {/* Aksi 1: Lihat Detail (Kertas) */}
                      <Link 
                        href={`/pemeliharaan/korektif/${wo.id}`} 
                        className="p-2 hover:bg-[#CCFBF1] text-[#0D9488] rounded-lg transition-all"
                        title="Lihat Detail"
                      >
                        <FileText size={18} />
                      </Link>
                      
                      {/* Aksi 2: Edit/Pengaturan (Gir) - SEKARANG BISA DIKLIK */}
                      <button 
                        onClick={() => handleEditClick(wo.id)}
                        className="p-2 hover:bg-gray-100 text-secondary rounded-lg transition-all"
                        title="Edit Work Order"
                      >
                        <Settings size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT WORK ORDER (POIN 10) */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={`Edit Work Order — ${selectedWO}`}
      >
        <form className="flex flex-col gap-5">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                 <label className="text-xs font-bold text-secondary uppercase">Update Progress (%)</label>
                 <input type="number" defaultValue="60" className="p-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm" />
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-xs font-bold text-secondary uppercase">Status Perbaikan</label>
                 <select className="p-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm">
                    <option>Dalam Proses</option>
                    <option>Menunggu Sparepart</option>
                    <option>Selesai</option>
                 </select>
              </div>
           </div>
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase">Catatan Teknisi Terbaru</label>
              <textarea rows={3} placeholder="Tambahkan log pengerjaan..." className="p-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm"></textarea>
           </div>
           <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-[#475569] hover:bg-gray-50 text-sm">Batal</button>
              <button type="submit" className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:opacity-90 shadow-md text-sm">Update Work Order</button>
           </div>
        </form>
      </Modal>
    </div>
  );
}