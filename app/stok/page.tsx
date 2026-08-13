"use client";

import React, { useState } from "react";
import { Plus, Search, ChevronDown, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";

export default function StockPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Data stok sesuai gambar Anda
  const stockItems = [
    { id: "STK-001", name: "Filter Oli Caterpillar 1R-0751", cat: "Filter", qty: 24, unit: "Pcs", supplier: "PT. Trakindo Utama", status: "Tersedia" },
    { id: "STK-002", name: "Belt Kipas Genset 3516", cat: "Sparepart Mesin", qty: 4, unit: "Pcs", supplier: "PT. Trakindo Utama", status: "Menipis" },
    { id: "STK-003", name: "Bearing SKF 6310", cat: "Sparepart", qty: 0, unit: "Pcs", supplier: "PT. Surya Teknik", status: "Habis" },
    { id: "STK-004", name: "Mechanical Seal Pompa Ebara", cat: "Seal", qty: 15, unit: "Set", supplier: "PT. Ebara Indonesia", status: "Tersedia" },
    { id: "STK-005", name: "Grease Shell Gadus S2 V220", cat: "Pelumas", qty: 8, unit: "Can", supplier: "PT. Shell Indonesia", status: "Tersedia" },
    { id: "STK-006", name: "Relay Omron MY2N-GS", cat: "Elektrikal", qty: 35, unit: "Pcs", supplier: "PT. Multi Elektrik", status: "Tersedia" },
    { id: "STK-007", name: "Oli Mesin Meditran S 40", cat: "Pelumas", qty: 2, unit: "Drum", supplier: "PT. Pertamina", status: "Menipis" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins">
      {/* 1. HEADER */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#0F172A]">Manajemen Stok</h1>
          <p className="text-[#475569] text-sm font-medium">Kelola inventaris suku cadang, pelumas, filter, dan material pemeliharaan</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-sm transition-all"
        >
          <Plus size={18} /> Tambah Item
        </button>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-4 gap-5">
        <StatCard label="Total Item Stok" val="523" desc="Jenis item terdaftar" color="text-[#0F172A]" />
        <StatCard label="Stok Menipis" val="18" desc="Butuh reorder segera" color="text-[#F59E0B]" />
        <StatCard label="Stok Habis" val="7" desc="Stok kosong (0)" color="text-[#EF4444]" />
        <StatCard label="Total Supplier" val="34" desc="Rekan pemasok aktif" color="text-[#10B981]" />
      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
          <input type="text" placeholder="Cari nama atau kode item..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary" />
        </div>
        <FilterSelect label="Kategori" />
        <FilterSelect label="Status" />
        <FilterSelect label="Supplier" />
      </div>

      {/* 4. TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#F8FAFC] border-b text-[#475569] font-bold">
            <tr>
              <th className="px-6 py-4 uppercase tracking-wider">Kode</th>
              <th className="px-6 py-4 uppercase tracking-wider">Nama Item</th>
              <th className="px-6 py-4 uppercase tracking-wider">Kategori</th>
              <th className="px-6 py-4 uppercase tracking-wider">Stok Saat Ini</th>
              <th className="px-6 py-4 uppercase tracking-wider">Satuan</th>
              <th className="px-6 py-4 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-4 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 uppercase tracking-wider text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stockItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-5 font-bold text-[#0F172A]">{item.id}</td>
                <td className="px-6 py-5 font-bold text-[#0F172A]">{item.name}</td>
                <td className="px-6 py-5 text-[#475569]">{item.cat}</td>
                <td className="px-6 py-5 font-black text-[#0F172A] text-[14px]">{item.qty}</td>
                <td className="px-6 py-5 text-[#475569]">{item.unit}</td>
                <td className="px-6 py-5 text-[#475569]">{item.supplier}</td>
                <td className="px-6 py-5">
                  <BadgeStock status={item.status} />
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-center gap-3">
                    <Link href={`/stok/${item.id}`} className="text-[#64748B] hover:text-[#0D9488]"><Eye size={18} /></Link>
                    <button onClick={() => setIsEditModalOpen(true)} className="text-[#64748B] hover:text-[#0F172A]"><Pencil size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Placeholders */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Item Stok Baru">
         <p className="text-sm text-secondary">Form tambah stok akan tampil di sini sesuai Poin 11.</p>
      </Modal>
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Item Stok">
         <p className="text-sm text-secondary">Form edit stok akan tampil di sini sesuai Poin 11.</p>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, val, desc, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1">
      <span className="text-[13px] text-[#94A3B8] font-medium">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{val}</span>
      <span className="text-[11px] text-[#94A3B8] mt-1">{desc}</span>
    </div>
  );
}

function FilterSelect({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#475569] cursor-pointer hover:border-primary transition-all min-w-[110px] justify-between">
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