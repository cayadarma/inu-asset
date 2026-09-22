"use client";

import React, { useState, use, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, Edit3, PowerOff, Power, Trash2, Calendar, MapPin, Tag, 
  Image as LucideImage, ChevronDown, Wrench, AlertTriangle, X, Camera as CameraIcon,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import imageCompression from 'browser-image-compression';
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { CHECKLIST_CATEGORY_OPTIONS, ChecklistCategoryOption } from "@/constants/checklistTemplates";

export default function AssetDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
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
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationNote, setDeactivationNote] = useState("");
  const [isReactivating, setIsReactivating] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  // --- STATE HAPUS PERMANEN (khusus administrator & super_admin, hanya untuk aset tanpa riwayat) ---
  const [isPermaDeleteModalOpen, setIsPermaDeleteModalOpen] = useState(false);
  const [isCheckingDeletable, setIsCheckingDeletable] = useState(false);
  const [isDeletingPermanently, setIsDeletingPermanently] = useState(false);
  const [permaDeleteConfirmInput, setPermaDeleteConfirmInput] = useState("");

  // --- STATE FORM EDIT & TIPE (SAMA SEPERTI TAMBAH ASET) ---
  const [editData, setEditField] = useState<any>({});
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [isNewTypeEdit, setIsNewTypeEdit] = useState(false);

  // --- STATE FOTO EDIT (MULTI, MAKS 5) ---
  const MAX_PHOTOS = 5;
  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [editNewPreviews, setEditNewPreviews] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  // --- STATE CAROUSEL FOTO (TAMPILAN DETAIL) ---
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // --- HAK AKSES KHUSUS ADMINISTRATOR & SUPER ADMIN (mis. untuk field checklist di bawah, dan hapus aset) ---
  const canManageChecklistParts = user?.role === "administrator" || user?.role === "super_admin";
  const canDeleteAsset = user?.role === "administrator" || user?.role === "super_admin";

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
      const existingPhotos: string[] = Array.isArray(assetData.image_urls) && assetData.image_urls.length > 0
        ? assetData.image_urls
        : (assetData.image_url ? [assetData.image_url] : []);
      setEditExistingUrls(existingPhotos);
      setActivePhotoIndex(0);
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

  // --- LOGIKA OLAH FOTO EDIT (HEIC & COMPRESSION, MULTI FOTO MAKS 5) ---
  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentTotal = editExistingUrls.length + editNewFiles.length;
    const remainingSlots = MAX_PHOTOS - currentTotal;
    if (remainingSlots <= 0) {
      alert(`Maksimal ${MAX_PHOTOS} foto per aset.`);
      e.target.value = "";
      return;
    }
    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(`Hanya ${remainingSlots} foto yang ditambahkan, karena maksimal ${MAX_PHOTOS} foto per aset.`);
    }

    setIsLoading(true);
    try {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];
      for (let file of filesToProcess) {
        if (file.name.toLowerCase().endsWith(".heic")) {
          const heic2any = (await import("heic2any")).default;
          const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
          file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
        }
        const compressedFile = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true });
        newFiles.push(compressedFile);
        newPreviews.push(URL.createObjectURL(compressedFile));
      }
      setEditNewFiles((prev) => [...prev, ...newFiles]);
      setEditNewPreviews((prev) => [...prev, ...newPreviews]);
    } catch (error) {
      console.error("Gagal olah gambar:", error);
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const handleRemoveExistingEditPhoto = (index: number) => {
    setEditExistingUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewEditPhoto = (index: number) => {
    setEditNewFiles((prev) => prev.filter((_, i) => i !== index));
    setEditNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetEditPhotoState = () => {
    const existingPhotos: string[] = Array.isArray(asset?.image_urls) && asset.image_urls.length > 0
      ? asset.image_urls
      : (asset?.image_url ? [asset.image_url] : []);
    setEditExistingUrls(existingPhotos);
    setEditNewFiles([]);
    setEditNewPreviews([]);
  };

  // --- FUNGSI UPDATE DATA ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Simpan Tipe Baru jika ada
    if (isNewTypeEdit && editData.type) {
      await supabase.from("asset_types").insert([{ name: editData.type }]);
    }

    let finalImageUrls = [...editExistingUrls];

    // 2. Upload Foto Baru jika ada (bisa lebih dari 1)
    for (const file of editNewFiles) {
      const fileName = `${Date.now()}-updated-${id}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
        finalImageUrls.push(publicUrl);
      }
    }

    // 3. Update Database
    const { error } = await supabase.from("assets").update({
      name: editData.name,
      type: editData.type,
      specification: editData.specification,
      status: editData.status,
      checklist_category: editData.checklist_category || null,
      checklist_pengawas: editData.checklist_pengawas || null,
      image_url: finalImageUrls[0] || "",
      image_urls: finalImageUrls
    }).eq("id", id);

    if (error) alert("Gagal: " + error.message);
    else {
      alert("Berhasil diperbarui!");
      setIsEditModalOpen(false);
      setEditNewFiles([]);
      setEditNewPreviews([]);
      setIsNewTypeEdit(false);
      fetchDetail();
      fetchTypes();
    }
    setIsLoading(false);
  };

  // --- NONAKTIFKAN ASET (soft-delete) ---
  // Sengaja TIDAK menyentuh kolom `status` (Beroperasi/Rusak/Pemeliharaan/dst) sama sekali.
  // `is_active` murni menandai apakah aset masih terdaftar/dipakai atau tidak, terpisah dari
  // kondisi operasionalnya, supaya tidak bentrok dengan alur-alur lain yang otomatis mengubah
  // `status` (mis. selesai Work Order -> "Beroperasi", lapor kerusakan -> "Rusak", dst).
  const handleDeactivate = async () => {
    if (isDeactivating) return; // cegah klik dobel
    if (!deactivationNote.trim()) {
      alert("Keterangan alasan nonaktif wajib diisi (mis. alasan & apakah aset masih berada di lokasi perusahaan atau sudah dilelang).");
      return;
    }
    setIsDeactivating(true);
    const { error } = await supabase.from("assets").update({
      is_active: false,
      deactivation_note: deactivationNote.trim(),
      deactivated_at: new Date().toISOString(),
      deactivated_by: user?.name || null,
    }).eq("id", id);
    if (error) {
      alert("Gagal menonaktifkan aset: " + error.message);
      setIsDeactivating(false);
    } else {
      setIsDeactivateModalOpen(false);
      setDeactivationNote("");
      await fetchDetail();
      setIsDeactivating(false);
    }
  };

  // --- AKTIFKAN KEMBALI ASET ---
  const handleReactivate = async () => {
    if (isReactivating) return; // cegah klik dobel
    setIsReactivating(true);
    const { error } = await supabase.from("assets").update({
      is_active: true,
      deactivation_note: null,
      deactivated_at: null,
      deactivated_by: null,
    }).eq("id", id);
    if (error) alert("Gagal mengaktifkan kembali aset: " + error.message);
    else await fetchDetail();
    setIsReactivating(false);
  };

  // --- CEK RIWAYAT ASET ---
  // Hapus permanen hanya boleh untuk aset yang BELUM PERNAH punya riwayat sama sekali
  // (kandidat kuat: salah input / data dummy / percobaan). Kalau sudah ada satu saja
  // riwayat WO, laporan kerusakan, atau jadwal pemeliharaan, aset dianggap "sudah pernah
  // hidup" di sistem dan wajib pakai jalur Nonaktifkan supaya riwayatnya tidak hilang.
  const checkAssetHistoryCounts = async () => {
    const [woRes, drRes, msRes] = await Promise.all([
      supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("asset_id", id),
      supabase.from("damage_reports").select("id", { count: "exact", head: true }).eq("asset_id", id),
      supabase.from("maintenance_schedules").select("id", { count: "exact", head: true }).eq("asset_id", id),
    ]);
    return {
      workOrders: woRes.count || 0,
      damageReports: drRes.count || 0,
      maintenanceSchedules: msRes.count || 0,
    };
  };

  // --- BUKA MODAL HAPUS PERMANEN (setelah lolos cek riwayat) ---
  const handleOpenPermaDelete = async () => {
    setIsCheckingDeletable(true);
    const counts = await checkAssetHistoryCounts();
    setIsCheckingDeletable(false);

    const totalHistory = counts.workOrders + counts.damageReports + counts.maintenanceSchedules;
    if (totalHistory > 0) {
      alert(
        `Aset ini tidak bisa dihapus permanen karena sudah punya riwayat: ` +
        `${counts.workOrders} Work Order, ${counts.damageReports} laporan kerusakan, ` +
        `${counts.maintenanceSchedules} jadwal pemeliharaan.\n\n` +
        `Untuk aset yang sudah pernah dipakai, gunakan "Nonaktifkan" saja supaya riwayatnya tetap tersimpan.`
      );
      return;
    }
    setPermaDeleteConfirmInput("");
    setIsPermaDeleteModalOpen(true);
  };

  // --- EKSEKUSI HAPUS PERMANEN ---
  const handlePermanentDelete = async () => {
    if (permaDeleteConfirmInput.trim() !== asset.id) return;
    setIsDeletingPermanently(true);

    // Cek ulang riwayat (jaga-jaga ada race condition: mis. laporan kerusakan baru masuk
    // tepat di antara buka modal ini dan klik hapus).
    const counts = await checkAssetHistoryCounts();
    const totalHistory = counts.workOrders + counts.damageReports + counts.maintenanceSchedules;
    if (totalHistory > 0) {
      alert("Aset ini ternyata sudah punya riwayat baru sejak modal ini dibuka, jadi tidak jadi dihapus. Silakan refresh halaman.");
      setIsDeletingPermanently(false);
      setIsPermaDeleteModalOpen(false);
      return;
    }

    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus aset: " + error.message);
      setIsDeletingPermanently(false);
    } else {
      router.push(`/registrasi-aset/${slug}?name=${locationNameFromUrl}`);
    }
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
            {(() => {
              const photos: string[] = Array.isArray(asset.image_urls) && asset.image_urls.length > 0
                ? asset.image_urls
                : (asset.image_url ? [asset.image_url] : []);
              const current = photos[activePhotoIndex] || photos[0] || "";
              return (
                <>
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 shadow-inner group">
                    <img
                      src={current || "https://placehold.co/600x400"}
                      alt="Asset"
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => openLightbox(current)}
                    />
                    {photos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePhotoIndex((prev) => (prev + 1) % photos.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full">
                          {photos.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActivePhotoIndex(idx)}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activePhotoIndex ? "bg-white w-3" : "bg-white/50"}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {photos.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {photos.map((src, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${idx === activePhotoIndex ? "border-[#0D9488]" : "border-transparent opacity-70"}`}
                        >
                          <img src={src} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            <div className="mt-4 flex justify-between items-center px-2">
              <span className="text-sm font-bold text-[#475569] dark:text-[#94A3B8]">Status Sekarang:</span>
              <Badge status={asset.is_active === false ? "Nonaktif" : asset.status} />
            </div>
          </div>

          {asset.is_active === false && (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-4 bg-[#F1F5F9] dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-[#334155]">
                <AlertTriangle size={16} className="text-[#94A3B8] mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-[#475569] dark:text-[#94A3B8] font-medium leading-relaxed">
                  Aset ini sudah dinonaktifkan. Aset tidak akan muncul di daftar/dropdown pemilihan aset untuk Work Order, jadwal pemeliharaan, atau lapor kerusakan baru, tapi seluruh riwayatnya tetap tersimpan.
                </p>
              </div>
              {asset.deactivation_note && (
                <div className="flex flex-col gap-1.5 p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/40">
                  <span className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider">Keterangan Nonaktif</span>
                  <p className="text-[13px] text-[#475569] dark:text-[#F8FAFC] font-medium leading-relaxed whitespace-pre-wrap">{asset.deactivation_note}</p>
                  <span className="text-[11px] text-[#94A3B8] mt-1">
                    {asset.deactivated_at && new Date(asset.deactivated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    {asset.deactivated_by ? ` · oleh ${asset.deactivated_by}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setIsEditModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all">
               <Edit3 size={18} /> Edit
            </button>
            {asset.is_active === false ? (
              <button onClick={handleReactivate} disabled={isReactivating} className="flex-1 flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-50">
                 <Power size={18} /> {isReactivating ? "Memproses..." : "Aktifkan Kembali"}
              </button>
            ) : (
              <button onClick={() => setIsDeactivateModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-[#EF4444] text-white py-3.5 rounded-xl font-bold text-sm shadow-md">
                 <PowerOff size={18} /> Nonaktifkan
              </button>
            )}
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
                       <Link href={`/buku-sakit/${slug}/${id}/${report.id}?name=${encodeURIComponent(locationNameFromUrl)}&assetName=${encodeURIComponent(asset?.name || "")}&issueTitle=${encodeURIComponent(report.issue_title)}`} className="px-5 py-2 bg-[#96BEFF] text-[#0932B6] rounded-lg font-bold text-[12px]">Detail</Link>
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

          {/* KONFIGURASI CHECKLIST HARIAN — kategori checklist bersifat statis (mengikuti
              template baku per kategori aset), aset hanya memilih kategorinya.
              Hanya Administrator yang bisa mengubah lewat modal Edit Informasi Utama Aset. */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-[#0D9488]" />
                <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-tight">Checklist Harian</h2>
              </div>
              {!canManageChecklistParts && (
                <span className="text-[10px] font-bold text-[#94A3B8] italic">Hanya administrator yang bisa mengubah</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-8 py-6">
              <DetailItem
                label="Kategori Checklist"
                val={
                  CHECKLIST_CATEGORY_OPTIONS.find((o: ChecklistCategoryOption) => o.value === asset.checklist_category)?.label ||
                  "Belum diatur"
                }
              />
              <DetailItem label="Pengawas Default" val={asset.checklist_pengawas} />
            </div>
            <p className="px-8 pb-6 -mt-2 text-[11px] text-[#94A3B8]">
              Field checklist mengikuti template baku sesuai kategori di atas. Ubah lewat tombol
              "Edit Informasi Utama Aset".
            </p>
          </div>
        </div>
      </div>

      {/* MODAL EDIT ASET (LOGIKA SAMA SEPERTI TAMBAH ASET) */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetEditPhotoState(); setIsNewTypeEdit(false); }} title="Edit Informasi Utama Aset">
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

             <EditField label="Spesifikasi" val={editData.specification} onChange={(e:any) => setEditField({...editData, specification: e.target.value})} multiline />
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Status</label>
                <select value={editData.status} onChange={(e) => setEditField({...editData, status: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white font-poppins">
                   <option>Beroperasi</option><option>Idle</option><option>Pemeliharaan</option><option>Rusak</option><option>Perbaikan</option>
                </select>
             </div>

             {/* KATEGORI CHECKLIST HARIAN — menentukan template field checklist statis yang
                 dipakai aset ini. Kosongkan jika aset tidak butuh checklist harian. */}
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Kategori Checklist</label>
                <select
                  value={editData.checklist_category || ""}
                  onChange={(e) => setEditField({ ...editData, checklist_category: e.target.value || null })}
                  className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white font-poppins"
                >
                  <option value="">-- Tidak Ada / Aset Tidak Butuh Checklist --</option>
                  {CHECKLIST_CATEGORY_OPTIONS.map((opt: ChecklistCategoryOption) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
             </div>

             <EditField
              label="Pengawas Default"
              val={editData.checklist_pengawas}
              onChange={(e: any) => setEditField({ ...editData, checklist_pengawas: e.target.value })}
             />
          </div>

          <div className="lg:col-span-1 flex flex-col gap-5">
             <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Foto Aset ({editExistingUrls.length + editNewFiles.length}/{MAX_PHOTOS})</label>
             <div className="grid grid-cols-3 gap-2">
                {editExistingUrls.map((src, idx) => (
                  <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] group">
                    <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => openLightbox(src)} />
                    <button type="button" onClick={() => handleRemoveExistingEditPhoto(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {editNewPreviews.map((src, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] group">
                    <img src={src} alt={`Foto baru ${idx + 1}`} className="w-full h-full object-cover cursor-zoom-in" onClick={() => openLightbox(src)} />
                    <button type="button" onClick={() => handleRemoveNewEditPhoto(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {(editExistingUrls.length + editNewFiles.length) < MAX_PHOTOS && (
                  <div className="aspect-square bg-[#D6DEE6] dark:bg-[#0F172A] rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-[#334155]">
                    <LucideImage size={24} className="text-[#94A3B8]" />
                    <span className="text-[9px] font-bold text-[#94A3B8] text-center px-1">Tambah Foto</span>
                  </div>
                )}
             </div>
             <input type="file" ref={editFileInputRef} onChange={handleEditImageChange} className="hidden" accept="image/*" multiple />
             <input type="file" ref={editCameraInputRef} onChange={handleEditImageChange} className="hidden" accept="image/*" capture="environment" />
             <div className="flex gap-2">
               <button type="button" disabled={(editExistingUrls.length + editNewFiles.length) >= MAX_PHOTOS} onClick={() => editFileInputRef.current?.click()} className="flex-1 px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-200 transition-all font-poppins disabled:opacity-40 disabled:cursor-not-allowed">Tambah Foto</button>
               <button type="button" disabled={(editExistingUrls.length + editNewFiles.length) >= MAX_PHOTOS} onClick={() => editCameraInputRef.current?.click()} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-200 transition-all font-poppins disabled:opacity-40 disabled:cursor-not-allowed"><CameraIcon size={14} /> Kamera</button>
             </div>
             <p className="text-[10px] text-[#94A3B8] -mt-3">Maksimal {MAX_PHOTOS} foto per aset.</p>
             <div className="flex flex-col gap-3 mt-auto pt-4">
                <button type="submit" className="w-full bg-[#0D9488] text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700">Simpan Perubahan</button>
                <button type="button" onClick={() => { setIsEditModalOpen(false); resetEditPhotoState(); setIsNewTypeEdit(false); }} className="w-full py-3.5 border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] rounded-xl font-bold text-sm text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">Batal</button>
             </div>
          </div>

          {/* ZONA BERBAHAYA — khusus administrator & super_admin. Sengaja dipisah jauh dari tombol
              Simpan/Batal (di kolom lain, di baris paling bawah) supaya tidak ada risiko
              salah klik untuk aksi yang sifatnya permanen/tidak bisa dibatalkan. */}
          {canDeleteAsset && (
            <div className="lg:col-span-3 mt-2 p-5 rounded-2xl border-2 border-dashed border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wider text-red-600">Zona Berbahaya</span>
                <p className="text-xs text-[#94A3B8] max-w-md">
                  Khusus untuk data yang salah input atau data percobaan (dummy) yang belum pernah dipakai sama sekali.
                  Kalau aset ini sudah pernah punya Work Order, laporan kerusakan, atau jadwal pemeliharaan, gunakan tombol
                  "Nonaktifkan" saja — aksi ini tidak akan berhasil kalau riwayatnya sudah ada.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenPermaDelete}
                disabled={isCheckingDeletable}
                className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-red-500 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
              >
                <Trash2 size={16} /> {isCheckingDeletable ? "Memeriksa riwayat..." : "Hapus Permanen"}
              </button>
            </div>
          )}
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS PERMANEN — hanya bisa dilanjutkan kalau kode aset diketik ulang persis */}
      <Modal isOpen={isPermaDeleteModalOpen} onClose={() => setIsPermaDeleteModalOpen(false)} title="Konfirmasi Hapus Permanen">
        <div className="flex flex-col items-center text-center gap-6 py-4">
           <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><Trash2 size={32} /></div>
           <p className="dark:text-white font-poppins text-lg">
             Aset <span className="font-bold text-red-600">{asset.name}</span> ({asset.id}) akan dihapus permanen.
           </p>
           <p className="text-sm text-[#94A3B8] -mt-4">
             Aksi ini <span className="font-bold text-red-500">tidak bisa dibatalkan</span> dan tidak menyisakan jejak apa pun. Aset ini sudah dipastikan belum punya riwayat WO/kerusakan/pemeliharaan. Ketik ulang kode aset <span className="font-mono font-bold">{asset.id}</span> di bawah untuk melanjutkan.
           </p>
           <input
             type="text"
             value={permaDeleteConfirmInput}
             onChange={(e) => setPermaDeleteConfirmInput(e.target.value)}
             placeholder={`Ketik "${asset.id}" untuk konfirmasi`}
             className="w-full px-4 py-3 border-2 border-gray-200 dark:border-[#334155] rounded-xl text-sm text-center font-mono font-bold outline-none focus:border-red-500 bg-white dark:bg-[#1E293B] dark:text-white"
           />
           <div className="flex gap-4 w-full">
              <button onClick={() => setIsPermaDeleteModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] rounded-xl font-bold text-secondary dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">Batal</button>
              <button
                onClick={handlePermanentDelete}
                disabled={isDeletingPermanently || permaDeleteConfirmInput.trim() !== asset.id}
                className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingPermanently ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
           </div>
        </div>
      </Modal>

      {/* MODAL KONFIRMASI NONAKTIFKAN */}
      <Modal isOpen={isDeactivateModalOpen} onClose={() => { setIsDeactivateModalOpen(false); setDeactivationNote(""); }} title="Konfirmasi Nonaktifkan Aset">
        <div className="flex flex-col items-center text-center gap-6 py-4">
           <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><PowerOff size={32} /></div>
           <p className="dark:text-white font-poppins text-lg">Yakin nonaktifkan <span className="font-bold text-red-600">{asset.name}</span>?</p>
           <p className="text-sm text-[#94A3B8] -mt-4">
             Aset tidak akan dihapus. Seluruh riwayat pemeliharaan, kerusakan, dan biaya tetap tersimpan. Aset hanya akan disembunyikan dari daftar aktif dan dropdown pemilihan aset baru. Kamu bisa mengaktifkannya kembali kapan saja.
           </p>
           <div className="w-full flex flex-col gap-2 text-left">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Keterangan Nonaktif <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={deactivationNote}
                onChange={(e) => setDeactivationNote(e.target.value)}
                placeholder="Contoh: Sudah dilelang pada Januari 2026, sudah tidak berada di lokasi perusahaan. / Rusak berat, masih tersimpan di gudang menunggu proses lelang."
                className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white resize-none"
              />
              <p className="text-[11px] text-[#94A3B8]">Jelaskan alasan nonaktif dan apakah aset masih berada di lokasi perusahaan atau sudah dilelang/dipindahkan.</p>
           </div>
           <div className="flex gap-4 w-full">
              <button onClick={() => { setIsDeactivateModalOpen(false); setDeactivationNote(""); }} disabled={isDeactivating} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] rounded-xl font-bold text-secondary dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">Batal</button>
              <button onClick={handleDeactivate} disabled={isDeactivating} className="flex-1 py-3 bg-[#EF4444] text-white rounded-xl font-bold shadow-md disabled:opacity-50">{isDeactivating ? "Memproses..." : "Ya, Nonaktifkan"}</button>
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
      <span className="text-[15px] font-bold text-[#0F172A] dark:text-[#F8FAFC] whitespace-pre-line">{val || "-"}</span>
    </div>
  );
}

function EditField({ label, val, onChange, type = "text", disabled = false, multiline = false }: any) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{label}</label>
      {multiline ? (
        <textarea
          defaultValue={val}
          onChange={onChange}
          disabled={disabled}
          rows={4}
          className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all resize-y ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] text-[#94A3B8]' : 'bg-white dark:bg-[#1E293B] font-bold text-[#0F172A] dark:text-[#F8FAFC]'}`}
        />
      ) : (
        <input type={type} defaultValue={val} onChange={onChange} disabled={disabled} className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] text-[#94A3B8]' : 'bg-white dark:bg-[#1E293B] font-bold text-[#0F172A] dark:text-[#F8FAFC]'}`} />
      )}
    </div>
  );
}