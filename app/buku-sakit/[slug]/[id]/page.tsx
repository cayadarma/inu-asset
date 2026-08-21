"use client";

import React, { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Plus, Image as LucideImage, ChevronDown, 
  Eye, X, Wrench, AlertTriangle, Calendar, User 
} from "lucide-react";
import imageCompression from 'browser-image-compression';
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"; // Pastikan import ini ada

export default function BukuSakitDetailPage({ params }: { params: Promise<{ slug: string, id: string }> }) {
  const { slug, id } = use(params);
  const searchParams = useSearchParams();
  
  // LOGIKA LOKASI: Menangkap nama asli dari URL
  const locationName = searchParams.get("name") || slug;

  // --- STATE DATA ---
  const [asset, setAsset] = useState<any>(null);
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"gangguan" | "pemeliharaan">("gangguan");

  // --- STATE MODAL & LIGHTBOX ---
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isViewDetailOpen, setIsViewDetailOpen] = useState(false); 
  const [selectedReport, setSelectedReport] = useState<any>(null); 
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  // --- STATE FORM LAPORAN ---
  const [reportData, setReportData] = useState({
    urgency: "Sedang",
    reporter_name: "",
    issue_title: "",
    description: ""
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FUNGSI AMBIL DATA ---
  const fetchData = async () => {
    setIsLoading(true);
    const { data: assetData } = await supabase.from("assets").select("*").eq("id", id).maybeSingle();
    const { data: reportData } = await supabase.from("damage_reports").select("*").eq("asset_id", id).order("created_at", { ascending: false });
    
    if (assetData) setAsset(assetData);
    if (reportData) setDamageReports(reportData);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- LOGIKA OLAH FOTO ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
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
  };

  // --- FUNGSI SIMPAN LAPORAN ---
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let finalImageUrl = "";
    if (imageFile) {
      const fileName = `${Date.now()}-detail-report-${id}`;
      const { data: uploadData } = await supabase.storage.from("asset-images").upload(fileName, imageFile);
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }
    }
    const { error } = await supabase.from("damage_reports").insert([{
      asset_id: id,
      reporter_name: reportData.reporter_name,
      issue_title: reportData.issue_title,
      description: reportData.description,
      urgency: reportData.urgency,
      image_url: finalImageUrl
    }]);
    if (!error) {
      await supabase.from("assets").update({ status: "Rusak" }).eq("id", id);
      alert("Laporan disimpan!");
      setIsRecordModalOpen(false);
      setImagePreview(null);
      fetchData();
    }
    setIsLoading(false);
  };

  const openLightbox = (src: string) => {
    if (!src) return;
    setLightboxSrc(src);
    setIsLightboxOpen(true);
  };

  if (isLoading && !asset) return <div className="p-20 text-center font-bold dark:text-white">Memuat...</div>;

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">

      {/* 2. HEADER INFO ASET */}
      <div className="p-6 bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-[#0F172A] rounded-xl overflow-hidden cursor-zoom-in" onClick={() => openLightbox(asset?.image_url)}>
                <img src={asset?.image_url || "https://placehold.co/80x80?text=ASSET"} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset?.name || "Memuat..."}</h1>
                    <Badge status={asset?.status || "Rusak"} />
                </div>
                <div className="text-sm text-[#475569] dark:text-[#94A3B8] flex gap-3">
                    <span className="font-bold">{id}</span><span>|</span><span>Tipe: {asset?.type}</span><span>|</span>
                    {/* MODIFIKASI: Menggunakan locationName asli */}
                    <span className="capitalize font-bold text-[#0D9488]">Lokasi: {locationName.toUpperCase()}</span>
                </div>
            </div>
        </div>
        {/* MODAL LINK MODIFIKASI: Menambahkan parameter name agar link tidak patah */}
        <Link href={`/registrasi-aset/${slug}/${id}?name=${locationName}`} className="px-5 py-2 border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-white hover:bg-gray-50 dark:hover:bg-[#0F172A]">Lihat Profil Aset</Link>
      </div>

      {/* 3. TABEL RECORD */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="px-6 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-gray-200 dark:border-[#334155] flex justify-between items-center">
          <div className="flex">
            <button onClick={() => setActiveTab("gangguan")} className={`px-6 py-5 text-sm font-bold transition-all ${activeTab === "gangguan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white dark:bg-[#1E293B]" : "text-[#94A3B8]"}`}>Record Gangguan</button>
            <button onClick={() => setActiveTab("pemeliharaan")} className={`px-6 py-5 text-sm font-bold transition-all ${activeTab === "pemeliharaan" ? "text-[#0D9488] border-b-2 border-[#0D9488] bg-white dark:bg-[#1E293B]" : "text-[#94A3B8]"}`}>Record Pemeliharaan</button>
          </div>
          <button onClick={() => setIsRecordModalOpen(true)} className="flex items-center gap-2 bg-[#0D9488] text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-md hover:bg-teal-700 transition-all"><Plus size={18} /> Tambah Record</button>
        </div>
        
        <div className="overflow-x-auto">
          {activeTab === "gangguan" ? (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#F1F5F9] dark:bg-[#0F172A]/50 border-b text-[#475569] dark:text-[#94A3B8] font-bold uppercase text-[11px] tracking-widest">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Masalah</th>
                  <th className="px-6 py-4">Pelapor</th>
                  <th className="px-6 py-4 text-center">Urgensi</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {damageReports.map((report, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#0F172A]/50 transition-colors">
                    <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8]">{new Date(report.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-5 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{report.issue_title}</td>
                    <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8]">{report.reporter_name}</td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded uppercase">{report.urgency || 'Sedang'}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {/* MODIFIKASI: Ubah Button menjadi Link ke halaman rute baru */}
                      <Link href={`/buku-sakit/${slug}/${id}/${report.id}?name=${locationName}&assetName=${asset?.name}&issueTitle=${report.issue_title}`} className="p-2 inline-block text-[#64748B] hover:text-[#0D9488] transition-all">
                          <Eye size={20} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-20 text-center text-[#94A3B8] italic">Riwayat pemeliharaan pencegahan akan tampil di sini.</div>
          )}
        </div>
      </div>

      {/* 4. MODAL TAMBAH RECORD */}
      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="Laporkan Kerusakan Aset">
        <form onSubmit={handleSubmitReport} className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white">Aset Terkait</label>
                <input type="text" value={`${id} - ${asset?.name}`} disabled className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm font-bold text-[#94A3B8] cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white">Tingkat Urgensi</label>
                <select value={reportData.urgency} onChange={(e) => setReportData({...reportData, urgency: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white">
                  <option>Berat (Mati Total)</option><option>Sedang</option><option>Ringan</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white">Nama Pelapor</label>
                <input required type="text" value={reportData.reporter_name} onChange={(e) => setReportData({...reportData, reporter_name: e.target.value})} placeholder="Nama pelapor" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white">Tanggal Kejadian</label>
                <input required type="date" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#0F172A] dark:text-white">Judul Masalah</label><input required type="text" value={reportData.issue_title} onChange={(e) => setReportData({...reportData, issue_title: e.target.value})} placeholder="Contoh: Mesin Bunyi Kasar" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" /></div>
            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#0F172A] dark:text-white">Kronologi</label><textarea rows={3} value={reportData.description} onChange={(e) => setReportData({...reportData, description: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white"></textarea></div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white">Foto Bukti</label>
            <div 
              className="w-full aspect-square bg-[#D6DEE6] dark:bg-[#0F172A] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-[#334155] overflow-hidden relative cursor-zoom-in"
              onClick={() => imagePreview && openLightbox(imagePreview)}
            >
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <><LucideImage size={48} className="text-[#94A3B8]" /><span className="text-xs font-bold text-[#94A3B8]">Preview</span></>}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-fit px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] dark:border-[#475569] rounded-lg text-[11px] font-bold text-[#475569] dark:text-white">Pilih file</button>
            <div className="flex flex-col gap-3 mt-auto pt-6">
              <button type="submit" className="w-full bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-all">Simpan Record</button>
              <button type="button" onClick={() => setIsRecordModalOpen(false)} className="w-full bg-white border border-gray-200 text-[#475569] py-3.5 rounded-xl font-bold text-sm">Batal</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL DETAIL GANGGUAN */}
      <Modal isOpen={isViewDetailOpen} onClose={() => setIsViewDetailOpen(false)} title="Detail Laporan Gangguan">
        {selectedReport && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Masalah Utama</span>
                <p className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{selectedReport.issue_title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Pelapor</span>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{selectedReport.reporter_name}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Tanggal Laporan</span>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{new Date(selectedReport.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Kronologi Kejadian</span>
                <p className="text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">{selectedReport.description || "Tidak ada deskripsi detail."}</p>
              </div>
              <div>
                 <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Urgensi</span>
                 <div className="mt-1"><span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded uppercase">{selectedReport.urgency}</span></div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Foto Bukti</span>
              <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] cursor-zoom-in" onClick={() => openLightbox(selectedReport.image_url)}>
                <img src={selectedReport.image_url || "https://placehold.co/400x250?text=No+Photo"} alt="Bukti" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. LIGHTBOX LAYAR PENUH */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsLightboxOpen(false)}>
          <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full"><X size={32} /></button>
          <img src={lightboxSrc} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300" alt="Fullscreen" />
        </div>
      )}
    </div>
  );
}