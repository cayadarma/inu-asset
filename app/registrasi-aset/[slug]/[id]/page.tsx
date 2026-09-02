"use client";

import React, { useState, use, useEffect, useRef } from "react";
import { 
  ChevronLeft, Edit3, Trash2, Calendar, MapPin, Tag, 
  Image as LucideImage, ChevronDown, Wrench, AlertTriangle, X 
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import imageCompression from 'browser-image-compression';
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

export default function AssetDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const locationNameFromUrl = searchParams.get("name") || "";
  const locationName = locationNameFromUrl.toUpperCase() || slug.toUpperCase();

  // --- STATE DATA ---
  const [asset, setAsset] = useState<any>(null);
  const [damageHistory, setDamageHistory] = useState<any[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pemeliharaan" | "kerusakan">("pemeliharaan");
  
  // --- STATE MODAL & LIGHTBOX ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  // --- STATE FORM EDIT & TIPE (SAMA SEPERTI TAMBAH ASET) ---
  const [editData, setEditField] = useState<any>({});
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [isNewTypeEdit, setIsNewTypeEdit] = useState(false);

  // --- STATE FOTO EDIT ---
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // --- AMBIL DATA DARI DB ---
  const fetchDetail = async () => {
    setIsLoading(true);
    const { data: assetData } = await supabase.from("assets").select("*").eq("id", id).maybeSingle();
    const { data: historyData } = await supabase.from("damage_reports").select("*").eq("asset_id", id).order("created_at", { ascending: false });
    // --- AMBIL RIWAYAT PEMELIHARAAN PENCEGAHAN DARI HALAMAN PEMELIHARAAN PENCEGAHAN ---
    const { data: maintenanceData } = await supabase
      .from("maintenance_schedules")
      .select("id, scheduled_date, status, operator_name, completed_at")
      .eq("asset_id", id)
      .order("scheduled_date", { ascending: false });

    if (assetData) {
      setAsset(assetData);
      setEditField(assetData);
      setEditImagePreview(assetData.image_url);
    }
    if (historyData) setDamageHistory(historyData);
    if (maintenanceData) setMaintenanceHistory(maintenanceData);
    setIsLoading(false);
  };

  const fetchTypes = async () => {
    const { data } = await supabase.from("asset_types").select("name").order("name", { ascending: true });
    if (data) setAvailableTypes(data);
  };

  useEffect(() => {
    fetchDetail();
    fetchTypes();
  }, [id]);

  // --- FUNGSI LIGHTBOX ---
  const openLightbox = (src: string) => {
    if (!src) return;
    setLightboxSrc(src);
    setIsLightboxOpen(true);
  };

  // --- LOGIKA OLAH FOTO EDIT (HEIC & COMPRESSION) ---
  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setEditImageFile(compressedFile);
      setEditImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error("Gagal olah gambar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI UPDATE DATA ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Simpan Tipe Baru jika ada
    if (isNewTypeEdit && editData.type) {
      await supabase.from("asset_types").insert([{ name: editData.type }]);
    }

    let finalImageUrl = asset.image_url;

    // 2. Upload Foto Baru jika ada
    if (editImageFile) {
      const fileName = `${Date.now()}-updated-${id}`;
      const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, editImageFile);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }
    }

    // 3. Update Database
    const { error } = await supabase.from("assets").update({
      name: editData.name,
      type: editData.type,
      specification: editData.specification,
      status: editData.status,
      image_url: finalImageUrl
    }).eq("id", id);

    if (error) alert("Gagal: " + error.message);
    else {
      alert("Berhasil diperbarui!");
      setIsEditModalOpen(false);
      setEditImageFile(null);
      setIsNewTypeEdit(false);
      fetchDetail();
      fetchTypes();
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) alert("Gagal hapus: " + error.message);
    else router.push(`/registrasi-aset/${slug}?name=${locationNameFromUrl}`);
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return "-";
    const start = new Date(dateString);
    const today = new Date();
    let years = today.getFullYear() - start.getFullYear();
    let months = today.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    return years === 0 ? `${months} bulan` : months === 0 ? `${years} tahun` : `${years} thn ${months} bln`;
  };

  if (isLoading && !asset) return <div className="p-20 text-center font-bold dark:text-white">Memuat...</div>;
  if (!asset) return <div className="p-20 text-center text-red-500 font-bold">Aset tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* KOLOM KIRI: VISUAL */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm">
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 cursor-zoom-in shadow-inner" onClick={() => openLightbox(asset.image_url)}>
               <img src={asset.image_url || "https://placehold.co/600x400"} alt="Asset" className="w-full h-full object-cover" />
            </div>
            <div className="mt-4 flex justify-between items-center px-2">
              <span className="text-sm font-bold text-[#475569] dark:text-[#94A3B8]">Status Sekarang:</span>
              <Badge status={asset.status} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsEditModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">
               <Edit3 size={18} /> Edit
            </button>
            <button onClick={() => setIsDeleteModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm shadow-md">
               <Trash2 size={18} /> Hapus
            </button>
          </div>
        </div>

        {/* KOLOM KANAN: INFO */}
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
               {activeTab === 'kerusakan' ? (
                 damageHistory.length > 0 ? damageHistory.map((report, i) => (
                    <div key={i} className="flex justify-between items-center p-6 border-b border-gray-50 dark:border-[#334155] last:border-0 hover:bg-gray-50 dark:hover:bg-[#0F172A]/50 transition-all group">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[15px] group-hover:text-[#0D9488] transition-colors">{report.issue_title}</span>
                          <span className="text-xs text-[#94A3B8] font-medium">{new Date(report.created_at).toLocaleDateString()} • Pelapor: {report.reporter_name}</span>
                       </div>
                       <Link href={`/buku-sakit/${slug}/${id}/${report.id}?name=${locationNameFromUrl}`} className="px-5 py-2 bg-[#96BEFF] text-[#0932B6] rounded-lg font-bold text-[12px]">Detail</Link>
                    </div>
                 )) : <p className="p-10 text-center text-secondary italic">Tidak ada riwayat.</p>
               ) : (
                 maintenanceHistory.length > 0 ? maintenanceHistory.map((sch, i) => (
                    <div key={i} className="flex justify-between items-center p-6 border-b border-gray-50 dark:border-[#334155] last:border-0 hover:bg-gray-50 dark:hover:bg-[#0F172A]/50 transition-all group">
                       <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[15px] group-hover:text-[#0D9488] transition-colors">
                            {sch.scheduled_date ? new Date(sch.scheduled_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                          </span>
                          <span className="text-xs text-[#94A3B8] font-medium">
                            Operator: {sch.operator_name || "-"}
                            {sch.completed_at ? ` • Selesai: ${new Date(sch.completed_at).toLocaleDateString("id-ID")}` : ""}
                          </span>
                       </div>
                       <div className="flex items-center gap-3">
                          <Badge status={sch.status} />
                          <Link href={`/pemeliharaan/checklist/${sch.id}`} className="px-5 py-2 bg-[#96BEFF] text-[#0932B6] rounded-lg font-bold text-[12px]">Detail</Link>
                       </div>
                    </div>
                 )) : <p className="p-10 text-center text-secondary italic">Belum ada riwayat pemeliharaan pencegahan.</p>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT ASET (LOGIKA SAMA SEPERTI TAMBAH ASET) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Informasi Utama Aset">
        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
             <EditField label="Nama Aset" val={editData.name} onChange={(e:any) => setEditField({...editData, name: e.target.value})} />
             
             {/* Dropdown Tipe (Sama Seperti Tambah Aset) */}
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Tipe Aset</label>
                <div className="relative">
                  <select 
                    value={isNewTypeEdit ? "custom" : editData.type}
                    onChange={(e) => {
                      if (e.target.value === "custom") { setIsNewTypeEdit(true); setEditField({...editData, type: ""}); }
                      else { setIsNewTypeEdit(false); setEditField({...editData, type: e.target.value}); }
                    }}
                    className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white cursor-pointer"
                  >
                    {availableTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    <option value="custom" className="text-primary font-bold">+ Ganti ke Tipe Baru...</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
                {isNewTypeEdit && (
                  <input type="text" placeholder="Ketik tipe baru..." value={editData.type} onChange={(e) => setEditField({...editData, type: e.target.value})} className="mt-2 w-full px-4 py-3 border-2 border-primary rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none dark:text-white" autoFocus />
                )}
             </div>

             <EditField label="Spesifikasi" val={editData.specification} onChange={(e:any) => setEditField({...editData, specification: e.target.value})} />
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Status</label>
                <select value={editData.status} onChange={(e) => setEditField({...editData, status: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white font-poppins">
                   <option>Beroperasi</option><option>Pemeliharaan</option><option>Rusak</option><option>Perbaikan</option>
                </select>
             </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-5">
             <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Foto Aset</label>
             <div 
               className="w-full aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] bg-gray-100 cursor-zoom-in"
               onClick={() => openLightbox(editImagePreview || "")}
             >
                <img src={editImagePreview || "https://placehold.co/400x400"} alt="Preview" className="w-full h-full object-cover" />
             </div>
             <input type="file" ref={editFileInputRef} onChange={handleEditImageChange} className="hidden" accept="image/*" />
             <button type="button" onClick={() => editFileInputRef.current?.click()} className="w-fit px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-200 transition-all font-poppins">Ganti Foto</button>
             <div className="flex flex-col gap-3 mt-auto pt-4">
                <button type="submit" className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700">Simpan Perubahan</button>
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditImagePreview(asset.image_url); setIsNewTypeEdit(false); }} className="w-full bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm">Batal</button>
             </div>
          </div>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus">
        <div className="flex flex-col items-center text-center gap-6 py-4">
           <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><AlertTriangle size={32} /></div>
           <p className="dark:text-white font-poppins text-lg">Yakin hapus permanen <span className="font-bold text-red-600">{asset.name}</span>?</p>
           <div className="flex gap-4 w-full">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-secondary">Batal</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold shadow-md">Ya, Hapus</button>
           </div>
        </div>
      </Modal>

      {/* LIGHTBOX */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
          <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-all border border-white/20"><X size={32} /></button>
          <img src={lightboxSrc} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300" alt="Fullscreen" />
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, val }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</span>
      <span className="text-[15px] font-bold text-[#0F172A] dark:text-[#F8FAFC]">{val || "-"}</span>
    </div>
  );
}

function EditField({ label, val, onChange, type = "text", disabled = false }: any) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{label}</label>
      <input type={type} defaultValue={val} onChange={onChange} disabled={disabled} className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] text-[#94A3B8]' : 'bg-white dark:bg-[#1E293B] font-bold text-[#0F172A] dark:text-[#F8FAFC]'}`} />
    </div>
  );
}