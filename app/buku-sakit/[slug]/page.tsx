"use client";

import React, { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Eye, Plus, ChevronDown, Calendar, User, Image as LucideImage, X, AlertCircle } from "lucide-react";
import imageCompression from 'browser-image-compression';
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

export default function AssetSakitListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const locationId = slug;

  // --- STATE DATA ---
  const [assets, setAssets] = useState<any[]>([]);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [realLocationName, setRealLocationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBrokenModalOpen, setIsBrokenModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  // --- STATE FILTER & SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("Semua Tipe");
  const [filterStatus, setFilterStatus] = useState("Semua Status");

  // --- STATE FORM LAPORAN ---
  const [reportData, setReportData] = useState({
    asset_id: "",
    urgency: "Sedang",
    reporter_name: "",
    issue_title: "",
    description: ""
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // STATE PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10; // Tampilkan 10 data per halaman

  // --- AMBIL DATA ---
  const fetchAssets = async () => {
    setIsLoading(true);

    // Hitung posisi data yang akan diambil
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data: locData } = await supabase.from("locations").select("name").eq("id", locationId).single();
    if (locData) setRealLocationName(locData.name);

    const { data: assetData } = await supabase
      .from("assets")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: true }); 

    const { data: typesData } = await supabase.from("asset_types").select("name");

    if (assetData) setAssets(assetData);
    if (typesData) setAvailableTypes(typesData);
    setIsLoading(false);
  };

  // Tambahkan currentPage di dalam dependency useEffect
  useEffect(() => { fetchAssets(); }, [locationId, currentPage]);

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
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1000 });
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (err) { console.error(err); }
    setIsLoading(false);
  };

  // --- FUNGSI KIRIM LAPORAN ---
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; 
    if (!reportData.asset_id) return alert("Pilih aset terlebih dahulu!");

    setIsLoading(true);
    try {
      let finalImageUrl = "";
      if (imageFile) {
        const fileName = `${Date.now()}-report-${reportData.asset_id}`;
        const { data: uploadData } = await supabase.storage.from("asset-images").upload(fileName, imageFile);
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
          finalImageUrl = publicUrl;
        }
      }

      const { error: reportError } = await supabase.from("damage_reports").insert([{
        asset_id: reportData.asset_id,
        reporter_name: reportData.reporter_name,
        issue_title: reportData.issue_title,
        description: reportData.description,
        urgency: reportData.urgency,
        image_url: finalImageUrl
      }]);

      if (!reportError) {
        await supabase.from("assets").update({ status: "Rusak" }).eq("id", reportData.asset_id);
        alert("Laporan terkirim!");
        setIsBrokenModalOpen(false);
        setImagePreview(null);
        setReportData({ asset_id: "", urgency: "Sedang", reporter_name: "", issue_title: "", description: "" });
        fetchAssets();
      }
    } catch (err) { console.error(err); }
    setIsLoading(false); 
  };

  // --- LOGIKA FILTERING ---
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || asset.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "Semua Tipe" || asset.type === filterType;
    const matchesStatus = filterStatus === "Semua Status" || asset.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/buku-sakit" className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-gray-200 shadow-sm"><ChevronLeft size={24} /></Link>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Daftar Kerusakan — {realLocationName || "Memuat..."}</h1>
        </div>
        <button onClick={() => setIsBrokenModalOpen(true)} className="bg-[#EF4444] text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-all flex items-center gap-2">
          <Plus size={18} /> Tambah Kerusakan Aset
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kode/nama aset..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all dark:text-white" />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer">
            <option>Semua Tipe</option>
            {availableTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer">
            <option>Semua Status</option><option>Beroperasi</option><option>Pemeliharaan</option><option>Rusak</option><option>Perbaikan</option>
          </select>
        </div>
      </div>

      {/* Tabel dengan Logic Loading & Empty State */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center text-[#94A3B8]">Memproses data...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <AlertCircle size={48} className="text-gray-200" />
               <p className="text-[#94A3B8] font-medium">Belum ada aset di lokasi ini.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] text-[13px] font-bold uppercase">
                <tr>
                  <th className="px-6 py-4">Kode</th><th className="px-6 py-4">Nama Aset</th><th className="px-6 py-4">Tipe</th><th className="px-6 py-4">Spesifikasi</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-[#0F172A]/50 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset.id}</td>
                    <td className="px-6 py-5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset.name}</td>
                    <td className="px-6 py-5 text-sm text-[#475569] dark:text-[#94A3B8]">{asset.type}</td>
                    <td className="px-6 py-5 text-sm text-[#475569] dark:text-[#94A3B8]">{asset.specification}</td>
                    <td className="px-6 py-5 text-center"><Badge status={asset.status} /></td>
                    <td className="px-6 py-5 text-center">
                      <Link href={`/buku-sakit/${locationId}/${asset.id}?name=${realLocationName}`} className="p-2 inline-block text-[#64748B] hover:text-[#0D9488] transition-all"><Eye size={20} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal & Lightbox tetap di bawah seperti kode sebelumnya */}
      <Modal isOpen={isBrokenModalOpen} onClose={() => setIsBrokenModalOpen(false)} title="Laporkan Kerusakan">
        <form onSubmit={handleSubmitReport} className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
           {/* ... isi form Anda ... */}
           <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white">Pilih Aset</label>
                <select required value={reportData.asset_id} onChange={(e) => setReportData({...reportData, asset_id: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white">
                  <option value="">-- Pilih Aset --</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white">Urgensi</label>
                <select value={reportData.urgency} onChange={(e) => setReportData({...reportData, urgency: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white"><option>Berat (Mati Total)</option><option>Sedang</option><option>Ringan</option></select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#0F172A] dark:text-white">Nama Pelapor</label><input required type="text" value={reportData.reporter_name} onChange={(e) => setReportData({...reportData, reporter_name: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" /></div>
              <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#0F172A] dark:text-white">Tanggal</label><input required type="date" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" /></div>
            </div>
            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#0F172A] dark:text-white">Judul Masalah</label><input required type="text" value={reportData.issue_title} onChange={(e) => setReportData({...reportData, issue_title: e.target.value})} placeholder="Contoh: Mesin Bunyi Kasar" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" /></div>
            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#0F172A] dark:text-white">Kronologi</label><textarea rows={3} value={reportData.description} onChange={(e) => setReportData({...reportData, description: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white"></textarea></div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white">Foto Aset Rusak</label>
            <div className="w-full aspect-square bg-[#D6DEE6] dark:bg-[#0F172A] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 overflow-hidden relative cursor-zoom-in" onClick={() => imagePreview && (setLightboxSrc(imagePreview), setIsLightboxOpen(true))}>
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <><LucideImage size={48} className="text-[#94A3B8]" /><span className="text-xs font-bold text-[#94A3B8]">Upload Foto</span></>}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-fit px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569] dark:text-white">Pilih Foto (.jpg, .png, .jpeg, .heic, .webp)</button>
            <div className="flex flex-col gap-3 mt-auto pt-6">
              <button type="submit" disabled={isLoading} className={`w-full py-4 rounded-xl font-bold text-sm shadow-md transition-all ${isLoading ? "bg-gray-400" : "bg-[#EF4444] text-white"}`}>Kirim Laporan</button>
              <button type="button" onClick={() => setIsBrokenModalOpen(false)} className="w-full bg-white border border-gray-200 text-[#475569] py-3.5 rounded-xl font-bold text-sm">Batal</button>
            </div>
          </div>
        </form>
      </Modal>

      {isLightboxOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setIsLightboxOpen(false)}>
          <img src={lightboxSrc} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in" alt="" />
          <button className="absolute top-6 right-6 text-white"><X size={32} /></button>
        </div>
      )}
    </div>
  );
}