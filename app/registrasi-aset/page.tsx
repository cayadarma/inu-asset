"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, MapPin, Plus, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageContext";
import { useDynamicText } from "@/lib/i18n/useDynamicText";

export default function RegistrasiAsetPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE UNTUK CRUD ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<any>(null); // Untuk Edit/Hapus
  const [newLocName, setNewLocName] = useState("");
  const [isSavingLoc, setIsSavingLoc] = useState(false);
  const [isDeletingLoc, setIsDeletingLoc] = useState(false);

  // --- STATE UNTUK TOGGLE TOMBOL EDIT/HAPUS ---
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (isSavingLoc) return; // cegah submit dobel
    setIsSavingLoc(true);

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
    setIsSavingLoc(false);
    fetchLocations();
  };

  // --- FUNGSI DELETE ---
  const handleDelete = async () => {
    if (!selectedLoc) return;
    if (isDeletingLoc) return; // cegah klik dobel
    setIsDeletingLoc(true);
    const { error } = await supabase.from("locations").delete().eq("id", selectedLoc.id);
    
    if (error) {
      alert(t("registrasiAset.list.gagalHapusAlert"));
    } else {
      setIsDeleteModalOpen(false);
      setSelectedLoc(null);
      fetchLocations();
    }
    setIsDeletingLoc(false);
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1000px] font-poppins text-left pb-10">
      {/* 1. HEADER DENGAN TOMBOL TAMBAH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("menu.registrasiAset")}</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm">{t("registrasiAset.list.subtitle")}</p>
        </div>
        <button 
          onClick={() => { setSelectedLoc(null); setNewLocName(""); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 shadow-md transition-all active:scale-95"
        >
          <Plus size={18} /> {t("registrasiAset.list.tambahLokasi")}
        </button>
      </div>

      {/* 2. LIST LOKASI DENGAN OPSI EDIT & HAPUS */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-10 text-center text-[#94A3B8]">{t("registrasiAset.list.memuatLokasi")}</div>
        ) : (
          locations.map((loc) => {
            const isExpanded = expandedId === loc.id;
            return (
            <LocationCard
              key={loc.id}
              loc={loc}
              isExpanded={isExpanded}
              t={t}
              onOpen={() => router.push(`/registrasi-aset/${loc.id}?name=${encodeURIComponent(loc.name)}`)}
              onEdit={() => { setSelectedLoc(loc); setNewLocName(loc.name); setIsModalOpen(true); }}
              onDelete={() => { setSelectedLoc(loc); setIsDeleteModalOpen(true); }}
              onToggleExpand={() => setExpandedId(isExpanded ? null : loc.id)}
            />
            );
          })
        )}
      </div>

      {/* 3. MODAL TAMBAH / EDIT LOKASI */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedLoc ? t("registrasiAset.list.editNamaLokasi") : t("registrasiAset.list.tambahLokasiBaru")}
      >
        <form onSubmit={handleSaveLocation} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.list.namaLokasiLabel")}</label>
            <input 
              required
              type="text" 
              placeholder={t("registrasiAset.list.namaLokasiPlaceholder")} 
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white font-bold"
            />
          </div>
          <div className="flex gap-3">
             <button type="button" disabled={isSavingLoc} onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-secondary dark:text-[#94A3B8] font-bold text-sm hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">{t("registrasiAset.common.batalkan")}</button>
             <button type="submit" disabled={isSavingLoc} className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-50">
                {isSavingLoc ? t("registrasiAset.common.menyimpan") : selectedLoc ? t("registrasiAset.common.simpanPerubahan") : t("registrasiAset.list.simpanLokasi")}
             </button>
          </div>
        </form>
      </Modal>

      {/* 4. MODAL KONFIRMASI HAPUS LOKASI */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t("registrasiAset.list.hapusLokasiTitle")}>
        <div className="flex flex-col items-center text-center gap-5 py-4">
           <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><AlertTriangle size={32} /></div>
           <div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.list.hapusLokasiConfirm", { name: selectedLoc?.name || "" })}</h3>
              <p className="text-xs text-[#94A3B8] mt-2 italic">{t("registrasiAset.list.hapusLokasiWarning")}</p>
           </div>
           <div className="flex gap-4 w-full mt-4">
              <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeletingLoc} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155] disabled:opacity-50">{t("registrasiAset.common.batal")}</button>
              <button onClick={handleDelete} disabled={isDeletingLoc} className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md disabled:opacity-50">{isDeletingLoc ? t("registrasiAset.common.menghapus") : t("registrasiAset.common.yaHapusPermanen")}</button>
           </div>
        </div>
      </Modal>

    </div>
  );
}

function LocationCard({ loc, isExpanded, t, onOpen, onEdit, onDelete, onToggleExpand }: any) {
  const displayName = useDynamicText(loc.name);
  return (
    <div
      onClick={onOpen}
      className="group relative bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-primary transition-all p-6 flex items-center justify-between cursor-pointer"
    >
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div className="w-12 h-12 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488] flex-shrink-0">
          <MapPin size={24} />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-tight truncate">{displayName}</span>
          <span className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">{t("registrasiAset.list.klikUntukManajemen")}</span>
        </div>
      </div>

      {/* TOMBOL EDIT & HAPUS: MUNCUL SETELAH CHEVRON DIKLIK */}
      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-200 ${
            isExpanded ? "max-w-[120px] opacity-100 mr-2" : "max-w-0 opacity-0"
          }`}
        >
          <button
            onClick={onEdit}
            className="p-2.5 bg-gray-50 dark:bg-[#0F172A] text-secondary dark:text-[#94A3B8] rounded-xl hover:text-primary transition-all border border-transparent hover:border-primary/20"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-transparent"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <button
          onClick={onToggleExpand}
          className={`p-2 rounded-full transition-all ${isExpanded ? "bg-gray-100 dark:bg-[#334155]" : "hover:bg-gray-100 dark:hover:bg-[#334155]"}`}
          title={isExpanded ? t("registrasiAset.list.sembunyikanAksi") : t("registrasiAset.list.tampilkanAksi")}
        >
          <ChevronRight size={20} className={`text-[#94A3B8] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
        </button>
      </div>
    </div>
  );
}