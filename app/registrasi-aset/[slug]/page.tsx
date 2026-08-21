"use client";

import React, { useState, use, useEffect, useRef } from "react";
import { Search, Plus, Eye, ChevronLeft, ChevronRight, Image as ImageIcon, ChevronDown, X } from "lucide-react";
import imageCompression from 'browser-image-compression';
import Link from "next/link";
import { useSearchParams } from "next/navigation"; // 1. Tambah useSearchParams
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

export default function AssetListPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const locationId = resolvedParams.slug;
  const searchParams = useSearchParams(); // Ambil parameter URL

  // --- STATE DATA ---
  const [assets, setAssets] = useState<any[]>([]);
  const [realLocationName, setRealLocationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempAge, setTempAge] = useState("Pilih tanggal pembelian aset!");
  const [isPreviewFullOpen, setIsPreviewFullOpen] = useState(false);

  // --- STATE FILTER & SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("Semua Tipe");
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  
  // --- STATE FORM ---
  const [newAsset, setNewAsset] = useState({
    id: "", name: "", type: "", specification: "", purchase_date: "", status: "Beroperasi"
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIKA HITUNG USIA ---
  const calculateAge = (dateString: string) => {
    if (!dateString) return "-";
    const purchaseDate = new Date(dateString);
    const today = new Date();
    let years = today.getFullYear() - purchaseDate.getFullYear();
    let months = today.getMonth() - purchaseDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < purchaseDate.getDate())) {
      years--;
      months += 12;
    }
    return years === 0 ? `${months} bulan` : months === 0 ? `${years} tahun` : `${years} thn ${months} bln`;
  };

  // --- LOGIKA OLAH FOTO ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      if (file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
        file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
      }
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error("Gagal olah gambar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- AMBIL DATA DARI DATABASE ---
  const fetchAssets = async () => {
    setIsLoading(true);
    
    // 2. Ambil Nama Lokasi & Update URL secara otomatis (Logika Cerdas)
    const { data: locData } = await supabase.from("locations").select("name").eq("id", locationId).single();
    if (locData) {
      setRealLocationName(locData.name);
      // Jika di URL belum ada ?name=LAGOON, kita tambahkan secara diam-diam
      if (!searchParams.get("name")) {
        const newUrl = `${window.location.pathname}?name=${locData.name}`;
        window.history.replaceState(null, '', newUrl);
      }
    }

    const { data: assetData, error } = await supabase
      .from("assets")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: true });

    if (!error && assetData) setAssets(assetData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, [locationId]);

  // --- LOGIKA FILTERING ---
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "Semua Tipe" || asset.type === filterType;
    const matchesStatus = filterStatus === "Semua Status" || asset.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // --- FUNGSI SIMPAN ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let finalImageUrl = "";
    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, imageFile);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }
    }
    const { error } = await supabase.from("assets").insert([{ ...newAsset, location_id: locationId, image_url: finalImageUrl }]);
    if (error) alert("Gagal: " + error.message);
    else {
      setIsModalOpen(false);
      setImagePreview(null);
      setNewAsset({ id: "", name: "", type: "", specification: "", purchase_date: "", status: "Beroperasi" });
      fetchAssets();
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 font-poppins text-left pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/registrasi-aset" className="p-2 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-gray-200">
            <ChevronLeft size={24} className="text-[#0F172A] dark:text-[#F8FAFC]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Daftar Aset — {realLocationName || "Memuat..."}
            </h1>
            <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">
              Menampilkan {filteredAssets.length} aset di lokasi {realLocationName}
            </p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-sm transition-all active:scale-95">
          <Plus size={18} /> Tambah Aset
        </button>
      </div>

      {/* 3. FILTER & SEARCH BAR */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input 
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode/nama aset..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all dark:text-white"
          />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-white outline-none">
          <option>Semua Tipe</option><option>Generator</option><option>Pompa Air</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-white outline-none">
          <option>Semua Status</option><option>Beroperasi</option><option>Pemeliharaan</option><option>Rusak</option>
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading && assets.length === 0 ? (
            <div className="p-20 text-center text-[#94A3B8]">Memproses data...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] text-sm font-bold">
                  <th className="px-6 py-4">Kode Aset</th>
                  <th className="px-6 py-4">Nama Aset</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/30 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset.id}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{asset.name}</td>
                    <td className="px-6 py-5 text-center"><Badge status={asset.status} /></td>
                    <td className="px-6 py-5 text-center">
                      {/* PENTING: Sertakan parameter name agar tidak hilang di detail aset */}
                      <Link href={`/registrasi-aset/${locationId}/${asset.id}?name=${realLocationName}`} className="p-2 inline-block text-[#64748B] hover:text-primary transition-all">
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Tambah Aset (Sama seperti sebelumnya) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Informasi Utama Aset">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-5 text-left">
             <FormInput label="Kode Aset" placeholder="Contoh: AST-001" value={newAsset.id} onChange={(e: any) => setNewAsset({...newAsset, id: e.target.value})} />
             <FormInput label="Nama Aset" placeholder="Masukkan nama aset" value={newAsset.name} onChange={(e: any) => setNewAsset({...newAsset, name: e.target.value})} />
             <FormInput label="Tipe Aset" placeholder="Pilih atau ketik tipe" value={newAsset.type} onChange={(e: any) => setNewAsset({...newAsset, type: e.target.value})} />
             <FormInput label="Spesifikasi" placeholder="Detail spek" value={newAsset.specification} onChange={(e: any) => setNewAsset({...newAsset, specification: e.target.value})} />
             <FormInput label="Tanggal Pembelian" type="date" value={newAsset.purchase_date} onChange={(e: any) => { setNewAsset({...newAsset, purchase_date: e.target.value}); setTempAge(calculateAge(e.target.value)); }} />
             <FormInput label="Umur Aset" value={tempAge} disabled />
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Lokasi Aset</label>
                <input type="text" value={realLocationName} disabled className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm text-[#94A3B8] font-bold" />
             </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5 text-left">
             <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Foto Aset</label>
              <div className={`w-full aspect-square bg-[#D6DEE6] dark:bg-[#0F172A] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-[#334155] overflow-hidden relative ${imagePreview ? 'cursor-zoom-in' : ''}`} onClick={() => imagePreview && setIsPreviewFullOpen(true)}>
                {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <><ImageIcon size={48} className="text-[#94A3B8]" /><span className="text-xs font-bold text-[#94A3B8]">Preview Foto</span></>}
              </div>
             <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageChange} accept=".jpg,.jpeg,.png,.svg,.heic" />
             <button type="button" onClick={() => fileInputRef.current?.click()} className="w-fit px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] dark:border-[#475569] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-200">Pilih Foto</button>
             <div className="flex flex-col gap-3 mt-auto pt-10">
                <button type="submit" className="w-full bg-[#0D9488] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">Simpan Aset</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full bg-[#EF4444] text-white py-4 rounded-xl font-bold text-sm">Batalkan</button>
             </div>
          </div>
        </form>
      </Modal>

      {/* Lightbox */}
      {isPreviewFullOpen && imagePreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setIsPreviewFullOpen(false)}>
          <img src={imagePreview} alt="Full" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}

function FormInput({ label, placeholder, value, type = "text", disabled = false, onChange }: any) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{label}</label>
      <input type={type} disabled={disabled} placeholder={placeholder} value={value} onChange={onChange} className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] cursor-not-allowed' : 'bg-white dark:bg-[#1E293B] dark:text-white'}`} />
    </div>
  );
}