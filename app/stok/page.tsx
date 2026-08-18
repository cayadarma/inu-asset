"use client";

import React, { useState } from "react";
import { Plus, Search, ChevronDown, Eye, Pencil, Package, Hash, Tag, Truck, Layers } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

export default function StockPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // State untuk menyimpan data barang yang sedang diedit
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const stockItems = [
    { id: "STK-001", name: "Filter Oli Caterpillar 1R-0751", cat: "Filter", qty: 24, unit: "Pcs", supplier: "PT. Trakindo Utama", status: "Tersedia" },
    { id: "STK-002", name: "Belt Kipas Genset 3516", cat: "Sparepart Mesin", qty: 4, unit: "Pcs", supplier: "PT. Trakindo Utama", status: "Menipis" },
    { id: "STK-003", name: "Bearing SKF 6310", cat: "Sparepart", qty: 0, unit: "Pcs", supplier: "PT. Surya Teknik", status: "Habis" },
    { id: "STK-004", name: "Mechanical Seal Pompa Ebara", cat: "Seal", qty: 15, unit: "Set", supplier: "PT. Ebara Indonesia", status: "Tersedia" },
    { id: "STK-005", name: "Grease Shell Gadus S2 V220", cat: "Pelumas", qty: 8, unit: "Can", supplier: "PT. Shell Indonesia", status: "Tersedia" },
    { id: "STK-006", name: "Relay Omron MY2N-GS", cat: "Elektrikal", qty: 35, unit: "Pcs", supplier: "PT. Multi Elektrik", status: "Tersedia" },
    { id: "STK-007", name: "Oli Mesin Meditran S 40", cat: "Pelumas", qty: 2, unit: "Drum", supplier: "PT. Pertamina", status: "Menipis" },
  ];

  // Fungsi untuk membuka modal edit dengan data item
  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left">
      {/* 1. HEADER */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Manajemen Stok</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Kelola inventaris suku cadang, pelumas, filter, dan material pemeliharaan</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-sm transition-all active:scale-95"
        >
          <Plus size={18} /> Tambah Item
        </button>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Item Stok" val="523" desc="Jenis item terdaftar" color="text-[#0F172A] dark:text-[#F8FAFC]" />
        <StatCard label="Stok Menipis" val="18" desc="Butuh reorder segera" color="text-[#F59E0B]" />
        <StatCard label="Stok Habis" val="7" desc="Stok kosong (0)" color="text-[#EF4444]" />
        <StatCard label="Total Supplier" val="34" desc="Rekan pemasok aktif" color="text-[#10B981]" />
      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex items-center gap-4">
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
          <input type="text" placeholder="Cari nama atau kode item..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm outline-none focus:border-primary" />
        </div>
        <FilterSelect label="Kategori" />
        <FilterSelect label="Status" />
        <FilterSelect label="Supplier" />
      </div>

      {/* 4. TABLE */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold">
              <tr>
                <th className="px-6 py-4 uppercase tracking-wider text-center">Kode</th>
                <th className="px-6 py-4 uppercase tracking-wider">Nama Item</th>
                <th className="px-6 py-4 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 uppercase tracking-wider">Stok Saat Ini</th>
                <th className="px-6 py-4 uppercase tracking-wider">Satuan</th>
                <th className="px-6 py-4 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155] dark:divide-[#334155]">
              {stockItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50/50 transition-colors">
                  <td className="px-6 py-5 font-bold text-[#475569] dark:text-[#94A3B8] text-center">{item.id}</td>
                  <td className="px-6 py-5 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.name}</td>
                  <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] font-medium">{item.cat}</td>
                  <td className={`px-6 py-5 font-black text-[14px] ${item.qty === 0 ? 'text-red-600' : 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>{item.qty}</td>
                  <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] font-medium">{item.unit}</td>
                  <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8]">{item.supplier}</td>
                  <td className="px-6 py-5 text-center">
                    <BadgeStock status={item.status} />
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-3">
                      <Link href={`/stok/${item.id}`} className="text-[#64748B] hover:text-[#0D9488] transition-colors"><Eye size={18} /></Link>
                      <button 
                        onClick={() => openEditModal(item)}
                        className="text-[#64748B] hover:text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL TAMBAH ITEM STOK */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Item Stok Baru">
         <form className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Kode Item</label>
              <input type="text" placeholder="Contoh: STK-008" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Kategori</label>
              <select className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary cursor-pointer font-medium">
                <option>Filter</option>
                <option>Sparepart Mesin</option>
                <option>Pelumas</option>
                <option>Elektrikal</option>
                <option>Seal</option>
              </select>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Nama Item / Nama Barang</label>
              <input type="text" placeholder="Masukkan nama barang lengkap" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Jumlah Stok Awal</label>
                <input type="number" placeholder="0" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Satuan</label>
                <select className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary cursor-pointer font-medium">
                  <option>Pcs</option><option>Set</option><option>Can</option><option>Drum</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Supplier Utama</label>
              <input type="text" placeholder="Nama perusahaan supplier" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary" />
            </div>
            <div className="md:col-span-2 flex gap-3 mt-4">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50 transition-all">Batalkan</button>
              <button type="submit" className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all">Simpan Item</button>
            </div>
         </form>
      </Modal>

      {/* 6. MODAL EDIT ITEM STOK */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Item: ${selectedItem?.id || ''}`}>
         <form className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Nama Item</label>
              <input type="text" defaultValue={selectedItem?.name} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm font-bold outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Update Stok (Saat Ini)</label>
              <div className="relative">
                <input type="number" defaultValue={selectedItem?.qty} className="w-full p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F1F5F9] text-sm font-black outline-none focus:border-primary text-[#0D9488]" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">{selectedItem?.unit}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Supplier</label>
              <input type="text" defaultValue={selectedItem?.supplier} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary" />
            </div>
            <div className="md:col-span-2 flex gap-3 mt-4">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50 transition-all">Batal</button>
              <button type="submit" className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all">Simpan Perubahan</button>
            </div>
         </form>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, val, desc, color }: any) {
  return (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
      <span className="text-[13px] text-[#94A3B8] font-medium tracking-tight">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{val}</span>
      <span className="text-[11px] text-[#94A3B8] mt-1 font-medium">{desc}</span>
    </div>
  );
}

function FilterSelect({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] font-bold cursor-pointer hover:border-primary transition-all shadow-sm">
      <span>{label}</span>
      <ChevronDown size={14} className="text-[#94A3B8]" />
    </div>
  );
}

function BadgeStock({ status }: { status: string }) {
  const styles: any = {
    "Tersedia": "bg-[#D1FAE5] text-[#065F46]",
    "Menipis": "bg-[#FFF7D6] text-[#E28E00]",
    "Habis": "bg-[#FEE2E2] text-[#991B1B]",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
}