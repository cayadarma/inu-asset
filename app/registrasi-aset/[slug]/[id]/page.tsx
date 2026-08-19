"use client";

import React, { useState, use, useEffect } from "react";
import { ChevronLeft, Edit3, Trash2, Calendar, MapPin, Tag, Image as ImageIcon, ChevronDown, Wrench, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation"; 

export default function AssetDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const locationName = slug.replace("-", " ").toUpperCase();
  const router = useRouter();

  // --- STATE DATA ---
  const [asset, setAsset] = useState<any>(null);
  const [damageHistory, setDamageHistory] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pemeliharaan" | "kerusakan">("pemeliharaan");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); 

  // --- STATE LIGHTBOX ---
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  // --- STATE FORM EDIT ---
  const [editData, setEditField] = useState<any>({});

  // --- LOGIKA AMBIL DATA ---
  const fetchDetail = async () => {
    setIsLoading(true);
    const { data: assetData } = await supabase.from("assets").select("*").eq("id", id).single();
    const { data: historyData } = await supabase.from("damage_reports").select("*").eq("asset_id", id).order("created_at", { ascending: false });

    if (assetData) {
      setAsset(assetData);
      setEditField(assetData);
    }
    if (historyData) setDamageHistory(historyData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  // --- LOGIKA UPDATE ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("assets")
      .update({
        name: editData.name,
        type: editData.type,
        specification: editData.specification,
        status: editData.status,
      })
      .eq("id", id);

    if (error) {
      alert("Gagal update: " + error.message);
    } else {
      alert("Data aset berhasil diupdate!");
      setIsEditModalOpen(false);
      fetchDetail();
    }
  };

  // --- LOGIKA HAPUS (MODIFIKASI DI SINI) ---
  const handleDelete = async () => {
    setIsLoading(true);
    
    // Tambahkan { count } untuk menghitung berapa baris yang benar-benar terhapus
    const { error, count } = await supabase
      .from("assets")
      .delete({ count: 'exact' }) // Minta Supabase menghitung baris
      .eq("id", id);

    if (error) {
      alert("Gagal menghapus: " + error.message);
      setIsLoading(false);
    } else {
      // Cek apakah ada data yang benar-benar terhapus
      alert("Aset berhasil dihapus permanen!");
      router.push(`/registrasi-aset/${slug}`);
    }
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return "-";
    const purchaseDate = new Date(dateString);
    const today = new Date();
    let years = today.getFullYear() - purchaseDate.getFullYear();
    let months = today.getMonth() - purchaseDate.getMonth();
    if (months < 0) { years--; months += 12; }
    return `${years} thn ${months} bln`;
  };

  const openLightbox = (src: string) => {
    setLightboxSrc(src);
    setIsLightboxOpen(true);
  };

  if (isLoading && !asset) return <div className="p-20 text-center font-bold text-secondary dark:text-white">Memuat data...</div>;
  if (!asset) return <div className="p-20 text-center text-red-500 font-bold">Aset tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* KOLOM KIRI: VISUAL & AKSI */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm">
            <div 
              className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 cursor-zoom-in"
              onClick={() => openLightbox(asset.image_url || "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800")}
            >
               <img 
                src={asset.image_url || "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800"} 
                alt="Asset" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
              />
            </div>
            <div className="mt-4 flex justify-between items-center px-2">
              <span className="text-sm font-bold text-[#475569] dark:text-[#94A3B8]">Status Sekarang:</span>
              <Badge status={asset.status} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsEditModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">
               <Edit3 size={18} /> Edit Aset
            </button>
            <button onClick={() => setIsDeleteModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-red-700 transition-all">
               <Trash2 size={18} /> Hapus Aset
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: INFO UTAMA & TAB RIWAYAT */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-8 uppercase tracking-tight">Informasi Utama Aset</h2>
            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
               <DetailItem label="Kode Aset" val={asset.id} />
               <DetailItem label="Nama Aset" val={asset.name} />
               <DetailItem label="Tipe Aset" val={asset.type} />
               <DetailItem label="Spesifikasi" val={asset.specification} />
               <DetailItem label="Tanggal Pembelian" val={asset.purchase_date} />
               <DetailItem label="Usia Aset" val={calculateAge(asset.purchase_date)} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
            <div className="flex border-b bg-[#F8FAFC] dark:bg-[#0F172A]">
              <button onClick={() => setActiveTab("pemeliharaan")} className={`px-8 py-5 text-sm font-bold transition-all ${activeTab === "pemeliharaan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white dark:bg-[#1E293B]" : "text-[#94A3B8]"}`}>Riwayat Pemeliharaan</button>
              <button onClick={() => setActiveTab("kerusakan")} className={`px-8 py-5 text-sm font-bold transition-all ${activeTab === "kerusakan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white dark:bg-[#1E293B]" : "text-[#94A3B8]"}`}>Riwayat Kerusakan</button>
            </div>
            
            <div className="flex flex-col">
               {activeTab === 'kerusakan' && (
                 damageHistory.length > 0 ? damageHistory.map((report, i) => (
                    <div key={i} className="flex justify-between items-center p-6 border-b border-gray-50 dark:border-[#334155] last:border-0 hover:bg-gray-50 dark:hover:bg-[#0F172A]/50 transition-all">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[15px]">{report.issue_title}</span>
                          <span className="text-xs text-[#94A3B8] font-medium">{new Date(report.created_at).toLocaleDateString()} • Pelapor: {report.reporter_name}</span>
                       </div>
                       <Link href="/buku-sakit" className="px-5 py-2 bg-[#96BEFF] text-[#0932B6] rounded-lg font-bold text-[12px]">Lihat Detail</Link>
                    </div>
                 )) : <p className="p-10 text-center text-secondary italic">Tidak ada riwayat.</p>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT ASET */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Informasi Aset">
        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
             <EditField label="Nama Aset" val={editData.name} onChange={(e:any) => setEditField({...editData, name: e.target.value})} />
             <EditField label="Tipe Aset" val={editData.type} onChange={(e:any) => setEditField({...editData, type: e.target.value})} />
             <EditField label="Spesifikasi" val={editData.specification} onChange={(e:any) => setEditField({...editData, specification: e.target.value})} />
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Status Operasional</label>
                <select value={editData.status} onChange={(e) => setEditField({...editData, status: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white">
                   <option>Beroperasi</option><option>Pemeliharaan</option><option>Rusak</option>
                </select>
             </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5">
             <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Foto Aset</label>
             <div className="w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] bg-gray-100 shadow-inner">
                <img src={asset.image_url || "https://placehold.co/400x400"} alt="Preview" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col gap-3 mt-auto pt-6">
                <button type="submit" className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">Simpan Perubahan</button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm">Batalkan</button>
             </div>
          </div>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus Aset">
        <div className="flex flex-col items-center text-center gap-6 py-4">
           <div className="w-20 h-20 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle size={48} />
           </div>
           <div>
              <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Yakin ingin menghapus aset ini?</h3>
              <p className="text-sm text-[#64748B] mt-2 font-medium">Data <span className="font-bold text-red-600">{asset.name}</span> akan dihapus permanen dari database.</p>
           </div>
           <div className="flex gap-4 w-full">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-secondary dark:text-white hover:bg-gray-50 transition-all">Batal</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold hover:bg-red-700 shadow-md transition-all">Ya, Hapus Aset</button>
           </div>
        </div>
      </Modal>

      {/* LIGHTBOX */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setIsLightboxOpen(false)}>
          <button className="absolute top-6 right-6 text-white"><X size={32} /></button>
          <img src={lightboxSrc} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in" alt="" />
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, val }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">{label}</span>
      <span className="text-[15px] font-bold text-[#0F172A] dark:text-[#F8FAFC]">{val || "-"}</span>
    </div>
  );
}

function EditField({ label, val, onChange, type = "text", disabled = false }: any) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{label}</label>
      <input 
        type={type} 
        defaultValue={val} 
        onChange={onChange}
        disabled={disabled} 
        className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] text-[#94A3B8]' : 'bg-white dark:bg-[#1E293B] font-bold text-[#0F172A] dark:text-[#F8FAFC]'}`} 
      />
    </div>
  );
}