"use client";

import React, { useState, use, useEffect, useRef } from "react";
import { Search, Plus, Eye, ChevronLeft, ChevronRight, Image as ImageIcon, ChevronDown, X } from "lucide-react";
import imageCompression from 'browser-image-compression';
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

export default function AssetListPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const locationId = resolvedParams.slug;

  // --- STATE DATA ---
  const [assets, setAssets] = useState<any[]>([]);
  const [realLocationName, setRealLocationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempAge, setTempAge] = useState("Pilih tanggal pembelian aset!");
  const [isPreviewFullOpen, setIsPreviewFullOpen] = useState(false);
  
  // --- STATE FORM ---
  const [newAsset, setNewAsset] = useState({
    id: "",
    name: "",
    type: "",
    specification: "",
    purchase_date: "",
    status: "Beroperasi"
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
    if (years === 0) return `${months} bulan`;
    if (months === 0) return `${years} tahun`;
    return `${years} thn ${months} bln`;
  };

  // --- LOGIKA PILIH & OLAH FOTO (FIX WINDOW ERROR) ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      // 1. CEK JIKA HEIC (Konversi secara Dinamis agar tidak error di server)
      if (file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default; // Import hanya saat dibutuhkan
        const convertedBlob = await heic2any({ 
          blob: file, 
          toType: "image/jpeg", 
          quality: 0.7 
        });
        file = new File(
          [convertedBlob as Blob], 
          file.name.replace(/\.heic$/i, ".jpg"), 
          { type: "image/jpeg" }
        );
      }

      // 2. KOMPRESI GAMBAR
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // 3. SIMPAN KE STATE & PREVIEW
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));

    } catch (error) {
      console.error("Gagal olah gambar:", error);
      alert("Format gambar tidak didukung atau file rusak.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- AMBIL DATA DARI DATABASE ---
  const fetchAssets = async () => {
    setIsLoading(true);
    const { data: locData } = await supabase.from("locations").select("name").eq("id", locationId).single();
    if (locData) setRealLocationName(locData.name);

    const { data: assetData, error } = await supabase.from("assets").select("*").eq("location_id", locationId);
    if (!error && assetData) setAssets(assetData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, [locationId]);

  // --- FUNGSI SIMPAN DATA ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let finalImageUrl = "";

    // Upload ke Storage jika ada foto
    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("asset-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        alert("Gagal upload foto: " + uploadError.message);
        setIsLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("asset-images")
        .getPublicUrl(fileName);
      
      finalImageUrl = publicUrl;
    }

    // Simpan ke Database
    const { error } = await supabase
      .from("assets")
      .insert([{ 
        ...newAsset, 
        location_id: locationId,
        image_url: finalImageUrl
      }]);

    if (error) {
      alert("Gagal simpan aset: " + error.message);
    } else {
      alert("Aset berhasil disimpan!");
      setIsModalOpen(false);
      setImagePreview(null);
      setImageFile(null);
      setNewAsset({ id: "", name: "", type: "", specification: "", purchase_date: "", status: "Beroperasi" });
      fetchAssets(); // Refresh tabel
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
            <p className="text-[#475569] dark:text-[#94A3B8] text-sm">
              Menampilkan semua aset yang terdaftar pada lokasi {realLocationName}
            </p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-sm transition-all active:scale-95">
          <Plus size={18} /> Tambah Aset
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center text-[#94A3B8]">Memproses...</div>
          ) : assets.length === 0 ? (
            <div className="p-20 text-center text-[#94A3B8]">Belum ada aset di lokasi ini.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] text-sm font-bold">
                  <th className="px-6 py-4">Kode Aset</th>
                  <th className="px-6 py-4">Nama Aset</th>
                  <th className="px-6 py-4">Tipe Aset</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset.id}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{asset.name}</td>
                    <td className="px-6 py-4 text-sm text-[#475569] dark:text-[#94A3B8]">{asset.type}</td>
                    <td className="px-6 py-4 text-center"><Badge status={asset.status} /></td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/registrasi-aset/${locationId}/${asset.id}`} className="p-2 inline-block text-[#64748B] hover:text-primary transition-all">
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

      {/* MODAL TAMBAH ASET */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Informasi Utama Aset">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-5 text-left">
             <FormInput 
               label="Kode Aset" 
               placeholder="Contoh: AST-001" 
               value={newAsset.id}
               onChange={(e: any) => setNewAsset({...newAsset, id: e.target.value})}
             />
             <FormInput 
               label="Nama Aset" 
               placeholder="Masukkan nama aset" 
               value={newAsset.name}
               onChange={(e: any) => setNewAsset({...newAsset, name: e.target.value})}
             />
             <FormInput 
               label="Tipe Aset" 
               placeholder="Generator / Pompa / Dll" 
               value={newAsset.type}
               onChange={(e: any) => setNewAsset({...newAsset, type: e.target.value})}
             />
             <FormInput 
               label="Spesifikasi" 
               placeholder="Detail spesifikasi teknik" 
               value={newAsset.specification}
               onChange={(e: any) => setNewAsset({...newAsset, specification: e.target.value})}
             />
             <FormInput 
               label="Tanggal Pembelian Aset" 
               type="date" 
               value={newAsset.purchase_date}
               onChange={(e: any) => {
                 setNewAsset({...newAsset, purchase_date: e.target.value});
                 setTempAge(calculateAge(e.target.value));
               }} 
             />
             <FormInput label="Umur Aset" value={tempAge} disabled />
             
             <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Lokasi Aset</label>
                <div className="relative">
                  <select disabled className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm text-[#94A3B8] outline-none cursor-not-allowed font-bold">
                    <option>{realLocationName}</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
             </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-5 text-left">
             <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Foto Aset</label>
              <div 
                className={`w-full aspect-square bg-[#D6DEE6] dark:bg-[#0F172A] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-[#334155] overflow-hidden relative ${imagePreview ? 'cursor-zoom-in' : ''}`}
                onClick={() => imagePreview && setIsPreviewFullOpen(true)}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon size={48} className="text-[#94A3B8]" />
                    <span className="text-xs font-bold text-[#94A3B8]">Preview Foto</span>
                  </>
                )}
              </div>

             <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageChange} accept=".jpg,.jpeg,.png,.svg,.heic" />

             <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="w-fit px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] dark:border-[#475569] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-200 transition-all"
             >
                Pilih foto
             </button>
             
             <div className="flex flex-col gap-3 mt-auto pt-10">
                <button type="submit" className="w-full bg-[#0D9488] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">Simpan Aset</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full bg-[#EF4444] text-white py-4 rounded-xl font-bold text-sm shadow-md">Batalkan</button>
             </div>
          </div>
        </form>
      </Modal>

      {/* Lightbox Foto */}
      {isPreviewFullOpen && imagePreview && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in" 
          onClick={() => setIsPreviewFullOpen(false)}
        >
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
      <input 
        type={type} 
        disabled={disabled} 
        placeholder={placeholder} 
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] cursor-not-allowed' : 'bg-white dark:bg-[#1E293B] dark:text-white'}`} 
      />
    </div>
  );
}