"use client";

import React, { useState, use, useEffect, useRef } from "react";
import { Search, Plus, Eye, ChevronLeft, ChevronRight, Image as ImageIcon, ChevronDown, X, Camera as CameraIcon } from "lucide-react";
import imageCompression from 'browser-image-compression';
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { CHECKLIST_CATEGORY_OPTIONS, ChecklistCategoryOption } from "@/constants/checklistTemplates";
import { useLanguage } from "@/context/LanguageContext";
import { translateEnum } from "@/lib/i18n/enumTranslate";
import { useDynamicTextMap } from "@/lib/i18n/useDynamicText";

// Status awal aset saat registrasi -- default "Beroperasi", tapi bisa dipilih
// "Idle" untuk aset yang baru didaftarkan tapi belum langsung dipakai (mis. stok).
const ASSET_STATUS_OPTIONS = ["Beroperasi", "Idle", "Pemeliharaan", "Perbaikan", "Rusak"];

export default function AssetListPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const locationId = resolvedParams.slug;
  const searchParams = useSearchParams();
  const { t, lang } = useLanguage();

  // --- STATE DATA ---
  const [assets, setAssets] = useState<any[]>([]);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [realLocationName, setRealLocationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempAge, setTempAge] = useState(t("registrasiAset.form.pilihTanggalDulu"));

  // --- STATE FILTER & SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("Semua Tipe");
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [showInactive, setShowInactive] = useState(false);
  
  // --- STATE FORM ---
  const [newAsset, setNewAsset] = useState({
    id: "", name: "", type: "", specification: "", purchase_date: "", status: "Beroperasi", purchase_cost: "",
    checklist_category: "", checklist_pengawas: "", location_id: ""
  });
  const [isNewType, setIsNewType] = useState(false);

  const MAX_PHOTOS = 5;
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const paymentProofInputRef = useRef<HTMLInputElement>(null);

  // STATE PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10; // Tampilkan 10 data per halaman

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
    return years === 0
      ? t("registrasiAset.form.usiaBulan", { n: months })
      : months === 0
      ? t("registrasiAset.form.usiaTahun", { n: years })
      : t("registrasiAset.form.usiaTahunBulan", { tahun: years, bulan: months });
  };

  // --- AMBIL DATA DARI DATABASE ---
  const fetchAssets = async () => {
    setIsLoading(true);

    // Hitung posisi data yang akan diambil
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data: locData } = await supabase.from("locations").select("name").eq("id", locationId).single();
    if (locData) {
      setRealLocationName(locData.name);
      if (!searchParams.get("name")) {
        const newUrl = `${window.location.pathname}?name=${locData.name}`;
        window.history.replaceState(null, '', newUrl);
      }
    }

    const { data: assetData, error, count } = await supabase
      .from("assets")
      .select("*", { count: "exact" })
      .eq("location_id", locationId)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (!error && assetData) setAssets(assetData);
    if (typeof count === "number") setTotalCount(count);
    setIsLoading(false);
  };

  const fetchTypes = async () => {
    const { data } = await supabase.from("asset_types").select("name").order("name", { ascending: true });
    if (data) setAvailableTypes(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("id, name").order("name", { ascending: true });
    if (data) setAvailableLocations(data);
  };

  // Reset ke halaman 1 setiap kali pindah lokasi
  useEffect(() => {
    setCurrentPage(1);
    fetchTypes();
    fetchLocations();
    // Default lokasi aset baru = lokasi yang sedang dibuka
    setNewAsset((prev) => ({ ...prev, location_id: locationId }));
  }, [locationId]);

  // Ambil ulang data setiap kali locationId ATAU currentPage berubah
  useEffect(() => {
    fetchAssets();
  }, [locationId, currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // --- LOGIKA FILTERING (DIPASTIKAN BERJALAN) ---
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      asset.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "Semua Tipe" || asset.type === filterType;
    const matchesStatus = filterStatus === "Semua Status" || asset.status === filterStatus;
    const matchesActive = showInactive || asset.is_active !== false;
    
    return matchesSearch && matchesType && matchesStatus && matchesActive;
  });

  // Teks dinamis dari DB (nama aset, tipe aset, nama lokasi) diterjemahkan lewat DeepL (batch)
  const dynamicMap = useDynamicTextMap([
    realLocationName,
    ...filteredAssets.map((a) => a.name),
    ...filteredAssets.map((a) => a.type),
    ...availableTypes.map((t2) => t2.name),
    ...availableLocations.map((l) => l.name),
  ]);
  const dt = (text: string | null | undefined) => (text ? dynamicMap.get(text.trim()) ?? text : text);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - imageFiles.length;
    if (remainingSlots <= 0) {
      alert(t("registrasiAset.form.maksimalFoto", { max: MAX_PHOTOS }));
      e.target.value = "";
      return;
    }
    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(t("registrasiAset.form.hanyaFotoDitambahkan", { remaining: remainingSlots, max: MAX_PHOTOS }));
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
      setImageFiles((prev) => [...prev, ...newFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    } catch (error) {
      console.error("Gagal olah gambar:", error);
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      if (file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
        file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
      }
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true });
      setPaymentProofFile(compressedFile);
      setPaymentProofPreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error("Gagal olah bukti pembayaran:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAsset) return; // cegah submit dobel

    // Validasi: kalau biaya pembelian diisi, bukti pembayaran wajib ada
    if (newAsset.purchase_cost && Number(newAsset.purchase_cost) > 0 && !paymentProofFile) {
      alert(t("registrasiAset.form.buktiWajibAlert"));
      return;
    }

    setIsSubmittingAsset(true);

    if (isNewType && newAsset.type) {
      await supabase.from("asset_types").insert([{ name: newAsset.type }]);
    }

    // Upload semua foto aset (maks 5)
    const uploadedImageUrls: string[] = [];
    for (const file of imageFiles) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
        uploadedImageUrls.push(publicUrl);
      }
    }

    // Upload bukti pembayaran (jika ada)
    let paymentProofUrl = "";
    if (paymentProofFile) {
      const fileName = `${Date.now()}-bukti-${paymentProofFile.name}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(fileName, paymentProofFile);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("payment-proofs").getPublicUrl(fileName);
        paymentProofUrl = publicUrl;
      }
    }

    const targetLocationId = newAsset.location_id || locationId;

    const { error } = await supabase.from("assets").insert([{
      ...newAsset,
      purchase_cost: newAsset.purchase_cost ? Number(newAsset.purchase_cost) : null,
      checklist_category: newAsset.checklist_category || null,
      checklist_pengawas: newAsset.checklist_pengawas || null,
      location_id: targetLocationId,
      image_url: uploadedImageUrls[0] || "",
      image_urls: uploadedImageUrls,
      payment_proof_url: paymentProofUrl || null,
      is_active: true,
    }]);
    
    if (error) alert(`${t("registrasiAset.common.gagal")}: ${error.message}`);
    else {
      // Kalau aset disimpan ke lokasi lain (bukan lokasi halaman yang sedang dibuka),
      // tetap di halaman ini tapi beri tahu penggunanya lewat notifikasi.
      if (targetLocationId !== locationId) {
        const savedLocName = availableLocations.find((l) => String(l.id) === String(targetLocationId))?.name || t("registrasiAset.assetList.lokasiLain");
        alert(t("registrasiAset.assetList.savedElsewhereAlert", { name: newAsset.name, location: savedLocName }));
      }
      setIsModalOpen(false);
      setImagePreviews([]);
      setImageFiles([]);
      setPaymentProofFile(null);
      setPaymentProofPreview(null);
      setNewAsset({ id: "", name: "", type: "", specification: "", purchase_date: "", status: "Beroperasi", purchase_cost: "", checklist_category: "", checklist_pengawas: "", location_id: locationId });
      setIsNewType(false);
      fetchAssets();
      fetchTypes();
    }
    setIsSubmittingAsset(false);
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
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.assetList.title", { location: dt(realLocationName) || t("registrasiAset.common.memuat") })}</h1>
            <p className="text-[#475569] dark:text-[#94A3B8] text-sm">{t("registrasiAset.assetList.subtitle", { count: filteredAssets.length, location: dt(realLocationName) || "" })}</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-sm transition-all active:scale-95">
          <Plus size={18} /> {t("registrasiAset.assetList.tambahAset")}
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input 
            type="text" 
            placeholder={t("registrasiAset.common.cariPlaceholder")} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all dark:text-white" 
          />
        </div>
        
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer">
          <option value="Semua Tipe">{translateEnum("Semua Tipe", lang)}</option>
          {availableTypes.map(t2 => <option key={t2.name} value={t2.name}>{dt(t2.name)}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer">
          <option value="Semua Status">{translateEnum("Semua Status", lang)}</option>
          <option value="Beroperasi">{translateEnum("Beroperasi", lang)}</option>
          <option value="Idle">{translateEnum("Idle", lang)}</option>
          <option value="Pemeliharaan">{translateEnum("Pemeliharaan", lang)}</option>
          <option value="Rusak">{translateEnum("Rusak", lang)}</option>
          <option value="Perbaikan">{translateEnum("Perbaikan", lang)}</option>
        </select>

        <label className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-[#0D9488] w-4 h-4" />
          {t("registrasiAset.common.tampilkanNonaktif")}
        </label>
      </div>

      {/* Tabel Section */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center text-[#94A3B8]">{t("registrasiAset.common.memprosesData")}</div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-20 text-center text-[#94A3B8]">{t("registrasiAset.common.asetTidakDitemukan")}</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] text-sm font-bold">
                  <th className="px-6 py-4">{t("registrasiAset.common.kodeAset")}</th>
                  <th className="px-6 py-4">{t("registrasiAset.common.namaAset")}</th>
                  <th className="px-6 py-4">{t("registrasiAset.common.tipeAset")}</th>
                  <th className="px-6 py-4 text-center">{t("registrasiAset.common.status")}</th>
                  <th className="px-6 py-4 text-center">{t("registrasiAset.common.aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {/* PERBAIKAN: Menggunakan filteredAssets, bukan assets */}
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className={`hover:bg-gray-50 dark:hover:bg-[#334155]/30 transition-colors ${asset.is_active === false ? "opacity-60" : ""}`}>
                    <td className="px-6 py-5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset.id}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{dt(asset.name)}</td>
                    <td className="px-6 py-5 text-sm text-[#475569] dark:text-[#94A3B8]">{dt(asset.type)}</td>
                    <td className="px-6 py-5 text-center"><Badge status={asset.is_active === false ? "Nonaktif" : asset.status} /></td>
                    <td className="px-6 py-5 text-center">
                      <Link href={`/registrasi-aset/${locationId}/${asset.id}?name=${encodeURIComponent(realLocationName)}&assetName=${encodeURIComponent(asset.name)}`} className="p-2 inline-block text-[#64748B] hover:text-primary transition-all">
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {!isLoading && totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-[#334155]">
            <p className="text-xs text-[#94A3B8]">
              {t("registrasiAset.assetList.paginationInfo", { page: currentPage, totalPages, total: totalCount })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#334155] text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> {t("registrasiAset.common.sebelumnya")}
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[#334155] text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("registrasiAset.common.selanjutnya")} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah Aset & Lightbox tetap sama */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("registrasiAset.form.title")}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
             <FormInput label={t("registrasiAset.common.kodeAset")} placeholder={t("registrasiAset.form.kodeAsetPlaceholder")} value={newAsset.id} onChange={(e: any) => setNewAsset({...newAsset, id: e.target.value})} />
             <FormInput label={t("registrasiAset.common.namaAset")} placeholder={t("registrasiAset.form.namaAsetPlaceholder")} value={newAsset.name} onChange={(e: any) => setNewAsset({...newAsset, name: e.target.value})} />
             
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.common.tipeAset")}</label>
                <div className="relative">
                  <select 
                    value={isNewType ? "custom" : newAsset.type}
                    onChange={(e) => {
                      if (e.target.value === "custom") { setIsNewType(true); setNewAsset({...newAsset, type: ""}); }
                      else { setIsNewType(false); setNewAsset({...newAsset, type: e.target.value}); }
                    }}
                    className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white cursor-pointer font-bold"
                  >
                    <option value="">{t("registrasiAset.form.pilihTipePlaceholder")}</option>
                    {availableTypes.map(t2 => <option key={t2.name} value={t2.name}>{dt(t2.name)}</option>)}
                    <option value="custom" className="text-primary font-bold">{t("registrasiAset.form.tambahTipeBaru")}</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
                {isNewType && (
                  <input type="text" placeholder={t("registrasiAset.form.ketikTipeBaru")} value={newAsset.type} onChange={(e) => setNewAsset({...newAsset, type: e.target.value})} className="mt-2 w-full px-4 py-3 border-2 border-primary rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none dark:text-white" autoFocus />
                )}
             </div>

             <FormInput label={t("registrasiAset.form.spesifikasi")} placeholder={t("registrasiAset.form.spesifikasiPlaceholder")} value={newAsset.specification} onChange={(e: any) => setNewAsset({...newAsset, specification: e.target.value})} multiline />

             {/* STATUS AWAL ASET -- default Beroperasi, tapi aset baru bisa saja
                 belum langsung dipakai (mis. disimpan sebagai stok -> Idle). */}
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.form.statusAwal")}</label>
                <div className="relative">
                  <select
                    value={newAsset.status}
                    onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
                    className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white cursor-pointer font-bold"
                  >
                    {ASSET_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{translateEnum(s, lang)}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
             </div>

             <FormInput label={t("registrasiAset.form.tanggalPembelian")} type="date" value={newAsset.purchase_date} onChange={(e: any) => { setNewAsset({...newAsset, purchase_date: e.target.value}); setTempAge(calculateAge(e.target.value)); }} />
             <FormInput label={t("registrasiAset.form.umurAset")} value={tempAge} disabled />
             <FormInput label={t("registrasiAset.form.biayaPembelian")} type="number" placeholder={t("registrasiAset.form.biayaPlaceholder")} value={newAsset.purchase_cost} onChange={(e: any) => setNewAsset({...newAsset, purchase_cost: e.target.value})} />
             {newAsset.purchase_cost && Number(newAsset.purchase_cost) > 0 && (
               <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.form.buktiPembayaran")}</label>
                  <div className="w-full aspect-[4/3] bg-[#D6DEE6] dark:bg-[#0F172A] rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-[#334155] overflow-hidden relative cursor-pointer" onClick={() => paymentProofInputRef.current?.click()}>
                    {paymentProofPreview ? <img src={paymentProofPreview} alt={t("registrasiAset.form.buktiPembayaran")} className="w-full h-full object-cover" /> : <><ImageIcon size={36} className="text-[#94A3B8]" /><span className="text-xs font-bold text-[#94A3B8]">{t("registrasiAset.form.unggahBukti")}</span></>}
                  </div>
                  <input type="file" className="hidden" ref={paymentProofInputRef} onChange={handlePaymentProofChange} accept="image/*,.heic" />
               </div>
             )}
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.form.lokasiAset")}</label>
                <div className="relative">
                  <select
                    value={newAsset.location_id || locationId}
                    onChange={(e) => setNewAsset({ ...newAsset, location_id: e.target.value })}
                    className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white cursor-pointer font-bold"
                  >
                    {availableLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{dt(loc.name)}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
             </div>

             {/* KATEGORI CHECKLIST HARIAN — menentukan template field checklist statis.
                 Kosongkan jika aset ini tidak butuh checklist harian. */}
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.form.kategoriChecklist")}</label>
                <div className="relative">
                  <select
                    value={newAsset.checklist_category}
                    onChange={(e) => setNewAsset({ ...newAsset, checklist_category: e.target.value })}
                    className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white cursor-pointer"
                  >
                    <option value="">{t("registrasiAset.form.tidakAdaChecklist")}</option>
                    {CHECKLIST_CATEGORY_OPTIONS.map((opt: ChecklistCategoryOption) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
             </div>

             <FormInput
              label={t("registrasiAset.form.pengawasDefault")}
              placeholder={t("registrasiAset.form.pengawasPlaceholder")}
              value={newAsset.checklist_pengawas}
              onChange={(e: any) => setNewAsset({ ...newAsset, checklist_pengawas: e.target.value })}
             />
          </div>
          <div className="lg:col-span-1 flex flex-col gap-5 text-left">
             <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("registrasiAset.form.fotoAset", { n: imagePreviews.length, max: MAX_PHOTOS })}</label>
             <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-[#334155] group">
                    <img src={src} alt={t("registrasiAset.form.fotoAlt", { n: idx + 1 })} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLightboxImage(src)} />
                    <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < MAX_PHOTOS && (
                  <div className="aspect-square bg-[#D6DEE6] dark:bg-[#0F172A] rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-[#334155]">
                    <ImageIcon size={24} className="text-[#94A3B8]" />
                    <span className="text-[9px] font-bold text-[#94A3B8] text-center px-1">{t("registrasiAset.form.tambahFoto")}</span>
                  </div>
                )}
             </div>
             <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageChange} accept="image/*,.heic" multiple />
             <input type="file" className="hidden" ref={cameraInputRef} onChange={handleImageChange} accept="image/*" capture="environment" />
             <div className="flex gap-2">
               <button type="button" disabled={imagePreviews.length >= MAX_PHOTOS} onClick={() => fileInputRef.current?.click()} className="flex-1 px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] dark:border-[#475569] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed">{t("registrasiAset.form.pilihGaleri")}</button>
               <button type="button" disabled={imagePreviews.length >= MAX_PHOTOS} onClick={() => cameraInputRef.current?.click()} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#F1F5F9] dark:bg-[#334155] border border-[#AFBDD2] dark:border-[#475569] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"><CameraIcon size={14} /> {t("registrasiAset.form.kamera")}</button>
             </div>
             <p className="text-[10px] text-[#94A3B8] -mt-3">{t("registrasiAset.form.maksimalFoto", { max: MAX_PHOTOS })}</p>
             <div className="flex flex-col gap-3 mt-auto pt-10">
                <button type="submit" disabled={isSubmittingAsset} className="w-full bg-[#0D9488] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-50">{isSubmittingAsset ? t("registrasiAset.common.menyimpan") : t("registrasiAset.form.simpanAset")}</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-4 border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] rounded-xl font-bold text-sm text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">{t("registrasiAset.common.batalkan")}</button>
             </div>
          </div>
        </form>
      </Modal>

      {/* Lightbox Foto */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Full" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}

function FormInput({ label, placeholder, value, type = "text", disabled = false, onChange, multiline = false }: any) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{label}</label>
      {multiline ? (
        <textarea
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={4}
          className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary resize-y ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] cursor-not-allowed' : 'bg-white dark:bg-[#1E293B] dark:text-white'}`}
        />
      ) : (
        <input 
          type={type} 
          disabled={disabled} 
          placeholder={placeholder} 
          value={value}
          onChange={onChange}
          className={`w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary ${disabled ? 'bg-[#F8FAFC] dark:bg-[#0F172A] cursor-not-allowed' : 'bg-white dark:bg-[#1E293B] dark:text-white'}`} 
        />
      )}
    </div>
  );
}