"use client";

import React, { useState, use } from "react";
import { Search, Plus, Eye, ChevronLeft, ChevronRight, Image as ImageIcon, ChevronDown } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function AssetListPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const locationName = resolvedParams.slug.replace("-", " ").toUpperCase();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const assets = [
    { id: "AST-001", name: "Genset Caterpillar 3516", type: "Generator", spec: "2000 kVA, Diesel", age: "5 tahun", status: "Beroperasi" },
    { id: "AST-002", name: "Pompa Centrifugal Ebara", type: "Pompa Air", spec: "45 kW, 3-Phase", age: "3 tahun", status: "Beroperasi" },
    { id: "AST-003", name: "Compressor Atlas Copco", type: "Kompresor", spec: "7.5 Bar, Air-Cooled", age: "2 tahun", status: "Pemeliharaan" },
    { id: "AST-004", name: "Transformator Schneider", type: "Kelistrikan", spec: "1000 kVA, Step-Down", age: "6 tahun", status: "Beroperasi" },
    { id: "AST-005", name: "Chiller York Central", type: "HVAC", spec: "150 TR, Water-Cooled", age: "4 tahun", status: "Rusak" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Daftar Aset — {locationName}</h1>
          <p className="text-[#475569] text-sm">Menampilkan semua aset yang terdaftar pada lokasi {locationName}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-sm transition-all">
          <Plus size={18} /> Tambah Aset
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-gray-200 text-[#475569] text-sm font-bold">
                <th className="px-6 py-4">Kode Aset</th>
                <th className="px-6 py-4">Nama Aset</th>
                <th className="px-6 py-4">Tipe Aset</th>
                <th className="px-6 py-4">Spesifikasi</th>
                <th className="px-6 py-4">Usia Aset</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-[#0F172A]">{asset.id}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#0F172A]">{asset.name}</td>
                  <td className="px-6 py-4 text-sm text-[#475569]">{asset.type}</td>
                  <td className="px-6 py-4 text-sm text-[#475569]">{asset.spec}</td>
                  <td className="px-6 py-4 text-sm text-[#475569]">{asset.age}</td>
                  <td className="px-6 py-4 text-center"><Badge status={asset.status} /></td>
                  <td className="px-6 py-4 text-center">
                    <Link href={`/registrasi-aset/${resolvedParams.slug}/${asset.id}`} className="p-2 inline-block hover:bg-teal-50 text-primary rounded-lg transition-all">
                      <Eye size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM TAMBAH ASET (SESUAI DESAIN) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Informasi Utama Aset">
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-5">
             <FormInput label="Kode Aset" placeholder="Masukkan kode aset" />
             <FormInput label="Nama Aset" placeholder="Masukkan nama aset" />
             <FormInput label="Tipe Aset" placeholder="Masukkan tipe aset" />
             <FormInput label="Spesifikasi" placeholder="Masukkan spesifikasi aset" />
             <FormInput label="Tanggal Pembelian Aset" type="date" />
             <FormInput label="Umur Aset" placeholder="Pilih tanggal pembelian aset!" disabled />
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A]">Lokasi Aset</label>
                <div className="relative">
                  <select className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:border-primary cursor-pointer">
                    <option>Pilih Lokasi</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
             </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5">
             <label className="text-sm font-bold text-[#0F172A]">Foto Aset</label>
             <div className="w-full aspect-square bg-[#D6DEE6] rounded-xl flex flex-col items-center justify-center gap-2 border border-gray-200">
                <ImageIcon size={48} className="text-[#94A3B8]" />
                <span className="text-xs font-bold text-[#94A3B8]">Preview</span>
             </div>
             <button type="button" className="w-fit px-4 py-2 bg-[#F1F5F9] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569]">
                Pilih foto (.jpg, .png, .jpeg, .webp)
             </button>
             <div className="flex flex-col gap-3 mt-auto pt-6">
                <button type="submit" className="w-full bg-[#0D9488] text-white py-3 rounded-xl font-bold text-sm">Simpan Aset</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full bg-[#EF4444] text-white py-3 rounded-xl font-bold text-sm">Batalkan</button>
             </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FormInput({ label, placeholder, type = "text", disabled = false }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-[#0F172A]">{label}</label>
      <input type={type} disabled={disabled} placeholder={placeholder} className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary ${disabled ? 'bg-[#F8FAFC] cursor-not-allowed' : 'bg-white'}`} />
    </div>
  );
}