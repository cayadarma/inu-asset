"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, MapPin, Plus, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/ui/Modal";

export default function RegistrasiAsetPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE UNTUK CRUD ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<any>(null); // Untuk Edit/Hapus
  const [newLocName, setNewLocName] = useState("");

  const fetchLocations = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("locations").select("*").order("name", { ascending: true });
    if (data) setLocations(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchLocations(); }, []);

  // --- FUNGSI CREATE / UPDATE ---
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName) return;

    if (selectedLoc) {
      // LOGIKA EDIT (UPDATE)
      await supabase.from("locations").update({ name: newLocName }).eq("id", selectedLoc.id);
    } else {
      // LOGIKA TAMBAH (CREATE)
      await supabase.from("locations").insert([{ name: newLocName }]);
    }

    setNewLocName("");
    setSelectedLoc(null);
    setIsModalOpen(false);
    fetchLocations();
  };

  // --- FUNGSI DELETE ---
  const handleDelete = async () => {
    if (!selectedLoc) return;
    const { error } = await supabase.from("locations").delete().eq("id", selectedLoc.id);
    
    if (error) {
      alert("Gagal hapus: Pastikan lokasi sudah tidak memiliki aset di dalamnya.");
    } else {
      setIsDeleteModalOpen(false);
      setSelectedLoc(null);
      fetchLocations();
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1000px] font-poppins text-left pb-10">
      {/* 1. HEADER DENGAN TOMBOL TAMBAH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Registrasi Aset</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Kelola daftar lokasi dan wilayah kerja perusahaan</p>
        </div>
        <button 
          onClick={() => { setSelectedLoc(null); setNewLocName(""); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 shadow-md transition-all active:scale-95"
        >
          <Plus size={18} /> Tambah Lokasi
        </button>
      </div>

      {/* 2. LIST LOKASI DENGAN OPSI EDIT & HAPUS */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-10 text-center text-[#94A3B8]">Memuat lokasi...</div>
        ) : (
          locations.map((loc) => (
            <div 
              key={loc.id}
              className="group relative bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-primary transition-all p-6 flex items-center justify-between"
            >
              <Link href={`/registrasi-aset/${loc.id}?name=${encodeURIComponent(loc.name)}`} className="flex items-center gap-6 flex-1">
                <div className="w-12 h-12 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488]">
                  <MapPin size={24} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-tight">{loc.name}</span>
                  <span className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Klik untuk manajemen aset</span>
                </div>
              </Link>

              {/* ACTION BUTTONS (SELALU TERLIHAT, TIDAK PERLU HOVER) */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setSelectedLoc(loc); setNewLocName(loc.name); setIsModalOpen(true); }}
                  className="p-2.5 bg-gray-50 dark:bg-[#0F172A] text-secondary dark:text-[#94A3B8] rounded-xl hover:text-primary transition-all border border-transparent hover:border-primary/20"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => { setSelectedLoc(loc); setIsDeleteModalOpen(true); }}
                  className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-transparent"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-[1px] h-8 bg-gray-100 dark:bg-[#334155] mx-2"></div>
                <ChevronRight className="text-[#94A3B8]" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. MODAL TAMBAH / EDIT LOKASI */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedLoc ? "Edit Nama Lokasi" : "Tambah Lokasi Baru"}
      >
        <form onSubmit={handleSaveLocation} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Nama Lokasi / Wilayah Kerja</label>
            <input 
              required
              type="text" 
              placeholder="Contoh: GUDANG UTAMA atau LPS 6" 
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white font-bold"
            />
          </div>
          <div className="flex gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-secondary dark:text-[#94A3B8] font-bold text-sm hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">Batalkan</button>
             <button type="submit" className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">
                {selectedLoc ? "Simpan Perubahan" : "Simpan Lokasi"}
             </button>
          </div>
        </form>
      </Modal>

      {/* 4. MODAL KONFIRMASI HAPUS LOKASI */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Lokasi">
        <div className="flex flex-col items-center text-center gap-5 py-4">
           <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><AlertTriangle size={32} /></div>
           <div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Hapus Lokasi {selectedLoc?.name}?</h3>
              <p className="text-xs text-[#94A3B8] mt-2 italic">Perhatian: Anda tidak bisa menghapus lokasi yang masih berisi aset. Pindahkan atau hapus aset terlebih dahulu.</p>
           </div>
           <div className="flex gap-4 w-full mt-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]">Batal</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md">Ya, Hapus Permanen</button>
           </div>
        </div>
      </Modal>

    </div>
  );
}