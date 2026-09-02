"use client";

import React, { useState, use, useEffect, useRef } from "react";
import {
  ChevronLeft, Box, User, CheckCircle2, Circle,
  Camera, X, Lock, CheckCheck, Pencil, Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

interface ChecklistItem {
  id: string;
  task: string;
  status: "Belum" | "Selesai";
  image_url: string | null;
  sort_order: number;
}

interface Schedule {
  id: string;
  scheduled_date: string;
  status: string;
  operator_name: string | null;
  completed_at: string | null;
  asset_id: string;
  assets: {
    name: string;
    type: string;
    specification: string;
    locations: { name: string } | null;
  } | null;
}

export default function AgendaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [operatorName, setOperatorName] = useState("");
  const [isSavingOperator, setIsSavingOperator] = useState(false);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  const isLocked = schedule?.status === "Selesai";

  const fetchDetail = async () => {
    setIsLoading(true);
    const { data: scheduleData } = await supabase
      .from("maintenance_schedules")
      .select(`id, scheduled_date, status, operator_name, completed_at, asset_id, assets ( name, type, specification, locations ( name ) )`)
      .eq("id", id)
      .maybeSingle();

    const { data: checklistData } = await supabase
      .from("maintenance_checklist_items")
      .select("*")
      .eq("schedule_id", id)
      .order("sort_order", { ascending: true });

    if (scheduleData) {
      setSchedule(scheduleData as any);
      setOperatorName(scheduleData.operator_name || "");
    }
    if (checklistData) setChecklist(checklistData as any);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- PERBAIKAN: SET JUDUL TAB & UPDATE URL UNTUK BREADCRUMB ---
  useEffect(() => {
    if (schedule?.assets?.name) {
      // 1. Update Judul Browser
      document.title = `Pemeliharaan — ${schedule.assets.name}`;

      // 2. Update URL Query Params agar Navbar menampilkan Nama Aset, bukan UUID
      const url = new URL(window.location.href);
      if (url.searchParams.get("name") !== schedule.assets.name) {
        url.searchParams.set("name", schedule.assets.name);
        // Menggunakan replaceState agar tidak mengganggu fungsi 'Back' tombol browser
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [schedule?.assets?.name]);

  // --- SIMPAN NAMA OPERATOR SAAT SELESAI DIKETIK (ONBLUR) ---
  const handleOperatorBlur = async () => {
    if (isLocked || !schedule) return;
    if (operatorName === (schedule.operator_name || "")) return;
    setIsSavingOperator(true);
    await supabase.from("maintenance_schedules").update({ operator_name: operatorName }).eq("id", id);
    setIsSavingOperator(false);
  };

  // --- TOGGLE STATUS CHECKLIST (KLIK) ---
  const toggleChecklistStatus = async (item: ChecklistItem) => {
    if (isLocked) return;
    const newStatus = item.status === "Selesai" ? "Belum" : "Selesai";

    setChecklist(prev => prev.map(c => (c.id === item.id ? { ...c, status: newStatus } : c)));

    const { error } = await supabase.from("maintenance_checklist_items").update({ status: newStatus }).eq("id", item.id);
    if (error) {
      // rollback jika gagal
      setChecklist(prev => prev.map(c => (c.id === item.id ? { ...c, status: item.status } : c)));
      alert("Gagal memperbarui status: " + error.message);
    }

    // Otomatis ubah status agenda jadi "Berlangsung" saat item pertama mulai dikerjakan
    if (schedule?.status === "Terjadwal") {
      await supabase.from("maintenance_schedules").update({ status: "Berlangsung" }).eq("id", id);
      setSchedule(prev => (prev ? { ...prev, status: "Berlangsung" } : prev));
    }
  };

  // --- UPLOAD FOTO BUKTI PER ITEM CHECKLIST ---
  const handlePhotoChange = async (item: ChecklistItem, e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || isLocked) return;

    setUploadingId(item.id);
    try {
      if (file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
        file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
      }
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1200, useWebWorker: true });

      const fileName = `${Date.now()}-checklist-${item.id}`;
      const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("maintenance_checklist_items")
        .update({ image_url: publicUrl })
        .eq("id", item.id);
      if (updateError) throw updateError;

      setChecklist(prev => prev.map(c => (c.id === item.id ? { ...c, image_url: publicUrl } : c)));
    } catch (err: any) {
      alert("Gagal mengunggah foto: " + (err?.message || "Terjadi kesalahan"));
    } finally {
      setUploadingId(null);
      if (fileInputRefs.current[item.id]) fileInputRefs.current[item.id]!.value = "";
    }
  };

  const openLightbox = (src: string | null) => {
    if (!src) return;
    setLightboxSrc(src);
    setIsLightboxOpen(true);
  };

  // --- SELESAIKAN PEMELIHARAAN (KUNCI FORM) ---
  const handleCompleteMaintenance = async () => {
    if (!schedule) return;

    // --- VALIDASI WAJIB: NAMA OPERATOR ---
    if (!operatorName.trim()) {
      alert("Nama operator wajib diisi sebelum menyelesaikan pemeliharaan.");
      return;
    }

    // --- VALIDASI WAJIB: SEMUA CHECKLIST HARUS SELESAI ---
    const unfinished = checklist.filter(c => c.status !== "Selesai");
    if (unfinished.length > 0) {
      alert(`Masih ada ${unfinished.length} item checklist yang belum diselesaikan. Selesaikan semua item terlebih dahulu.`);
      return;
    }

    // --- VALIDASI WAJIB: SEMUA CHECKLIST HARUS ADA FOTO BUKTI ---
    const missingPhoto = checklist.filter(c => !c.image_url);
    if (missingPhoto.length > 0) {
      alert(`Masih ada ${missingPhoto.length} item checklist yang belum diberi foto bukti. Unggah foto bukti untuk semua item terlebih dahulu.`);
      return;
    }

    if (!confirm("Yakin ingin menyelesaikan pemeliharaan ini? Data tidak bisa diubah lagi setelah ini.")) return;

    const { error } = await supabase
      .from("maintenance_schedules")
      .update({ status: "Selesai", completed_at: new Date().toISOString(), operator_name: operatorName })
      .eq("id", id);

    if (error) {
      alert("Gagal menyelesaikan pemeliharaan: " + error.message);
      return;
    }

    // Kembalikan status aset ke Beroperasi
    await supabase.from("assets").update({ status: "Beroperasi" }).eq("id", schedule.asset_id);

    fetchDetail();
  };

  // --- BUKA KEMBALI (EDIT) PEMELIHARAAN YANG SUDAH SELESAI ---
  const handleEditMaintenance = async () => {
    if (!schedule) return;
    if (!confirm("Buka kembali agenda ini untuk diedit? Status akan berubah menjadi \"Berlangsung\".")) return;

    setIsUnlocking(true);
    const { error } = await supabase
      .from("maintenance_schedules")
      .update({ status: "Berlangsung", completed_at: null })
      .eq("id", id);
    setIsUnlocking(false);

    if (error) {
      alert("Gagal membuka agenda untuk diedit: " + error.message);
      return;
    }

    // Tandai aset kembali dalam proses pemeliharaan
    await supabase.from("assets").update({ status: "Pemeliharaan" }).eq("id", schedule.asset_id);

    fetchDetail();
  };

  // --- HAPUS AGENDA PEMELIHARAAN ---
  const handleDeleteMaintenance = async () => {
    if (!schedule) return;
    if (!confirm("Yakin ingin menghapus agenda pemeliharaan ini beserta seluruh checklist-nya? Tindakan ini tidak bisa dibatalkan.")) return;

    setIsDeleting(true);

    const { error: checklistError } = await supabase
      .from("maintenance_checklist_items")
      .delete()
      .eq("schedule_id", id);

    if (checklistError) {
      alert("Gagal menghapus checklist: " + checklistError.message);
      setIsDeleting(false);
      return;
    }

    const { error: scheduleError } = await supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", id);

    if (scheduleError) {
      alert("Gagal menghapus agenda: " + scheduleError.message);
      setIsDeleting(false);
      return;
    }

    // Kembalikan status aset ke Beroperasi setelah agenda dihapus
    await supabase.from("assets").update({ status: "Beroperasi" }).eq("id", schedule.asset_id);

    setIsDeleting(false);
    router.push("/pemeliharaan");
  };

  if (isLoading) return <div className="p-20 text-center font-bold dark:text-white font-poppins">Memuat detail agenda...</div>;
  if (!schedule) return <div className="p-20 text-center text-red-500 font-bold font-poppins">Agenda tidak ditemukan.</div>;

  const doneCount = checklist.filter(c => c.status === "Selesai").length;
  const progress = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;
  const innerBoxStyle = "bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155]";

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto pb-10 font-poppins text-left">

      {/* TOMBOL KEMBALI */}
      <Link
        href="/pemeliharaan"
        className="flex items-center gap-2 text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:text-[#0D9488] transition-all w-fit group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Kembali ke Kalender Pemeliharaan
      </Link>

      <div className="bg-white dark:bg-[#1E293B] rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-2xl overflow-hidden transition-all duration-300">

        {/* HEADER */}
        <div className="p-8 md:p-10 border-b border-gray-50 dark:border-[#334155] flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-[#0D9488]/10 text-[#0D9488] text-[10px] font-black rounded-full uppercase tracking-tighter border border-[#0D9488]/20">
                Pemeliharaan Pencegahan
              </span>
              <Badge status={schedule.status} />
              {isLocked && (
                <span className="flex items-center gap-1 text-[10px] font-black text-[#94A3B8] uppercase tracking-tighter">
                  <Lock size={12} /> Terkunci
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-1 leading-tight">
              {schedule.assets?.name || "Aset tidak ditemukan"}
            </h1>
          </div>
          <div className={`${innerBoxStyle} px-5 py-3 rounded-2xl shadow-sm text-right min-w-[160px]`}>
             <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest leading-none mb-1">Jadwal Pemeliharaan</p>
             <p className="text-sm font-bold text-[#475569] dark:text-[#F8FAFC]">{new Date(schedule.scheduled_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <div className="p-8 md:p-10 flex flex-col gap-10">

          {/* INFO ASET */}
          <div className="flex flex-col gap-4">
             <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] flex items-center gap-2">
               <Box size={14} className="text-[#0D9488]"/> Informasi Aset
             </h3>
             <div className={`p-6 rounded-[24px] shadow-sm ${innerBoxStyle}`}>
                <p className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{schedule.assets?.name}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[#475569] dark:text-[#94A3B8] mt-2 font-medium">
                   <span className="bg-[#CCFBF1] dark:bg-[#115E59]/40 text-[#0D9488] dark:text-[#37BAAE] px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider">{schedule.assets?.type || "-"}</span>
                   <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                   <span className="uppercase tracking-widest text-[12px] font-bold text-[#475569] dark:text-[#94A3B8]">{schedule.assets?.locations?.name || "-"}</span>
                </div>
                {schedule.assets?.specification && (
                  <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-3 italic">{schedule.assets.specification}</p>
                )}
             </div>
          </div>

          {/* NAMA OPERATOR */}
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] flex items-center gap-2">
              <User size={14} className="text-[#0D9488]" /> Operator Bertugas
            </label>
            <input
              type="text"
              disabled={isLocked}
              placeholder="Ketik nama operator/teknisi yang bertugas..."
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              onBlur={handleOperatorBlur}
              className={`w-full px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:border-primary transition-all ${innerBoxStyle} ${isLocked ? "text-[#94A3B8] cursor-not-allowed" : "text-[#0F172A] dark:text-[#F8FAFC]"}`}
            />
            {isSavingOperator && <span className="text-[11px] text-[#94A3B8] italic">Menyimpan...</span>}
          </div>

          {/* CHECKLIST */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckCheck size={14} className="text-[#0D9488]" /> Checklist Pemeliharaan
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-100 dark:bg-[#0F172A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0D9488] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs font-bold text-[#0D9488]">{progress}%</span>
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-100 dark:border-[#334155] overflow-hidden">
              {checklist.length === 0 ? (
                <div className="p-10 text-center text-[#94A3B8] italic">Tidak ada item checklist untuk agenda ini.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-[#334155]">
                  {checklist.map((item) => (
                    <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-[#1E293B]">
                      {/* STATUS + TASK (KLIK UNTUK TOGGLE) */}
                      <div
                        onClick={() => toggleChecklistStatus(item)}
                        className={`flex items-center gap-3 flex-1 ${isLocked ? "cursor-default" : "cursor-pointer group"}`}
                      >
                        {item.status === "Selesai" ? (
                          <CheckCircle2 size={22} className="text-[#10B981] flex-shrink-0" />
                        ) : (
                          <Circle size={22} className={`text-[#94A3B8] flex-shrink-0 ${!isLocked && "group-hover:text-[#0D9488]"}`} />
                        )}
                        <span className={`text-sm font-medium ${item.status === "Selesai" ? "text-gray-400 line-through" : "text-[#0F172A] dark:text-[#F8FAFC]"}`}>
                          {item.task}
                        </span>
                      </div>

                      {/* FOTO BUKTI */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            onClick={() => openLightbox(item.image_url)}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-[#334155] cursor-zoom-in"
                            alt="Bukti"
                          />
                        )}
                        <input
                          type="file"
                          ref={(el) => { fileInputRefs.current[item.id] = el; }}
                          onChange={(e) => handlePhotoChange(item, e)}
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.heic,.webp"
                          disabled={isLocked}
                        />
                        <button
                          type="button"
                          disabled={isLocked || uploadingId === item.id}
                          onClick={() => fileInputRefs.current[item.id]?.click()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#F1F5F9] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-200 dark:hover:bg-[#334155] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Camera size={14} />
                          {uploadingId === item.id ? "Mengunggah..." : item.image_url ? "Ganti Foto" : "Foto Bukti"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER ACTION */}
        <div className="p-8 md:p-10 border-t border-gray-100 dark:border-[#334155] bg-white dark:bg-[#1E293B] flex flex-col md:flex-row justify-between items-center gap-4">
          {isLocked ? (
            <p className="text-sm font-bold text-[#10B981] flex items-center gap-2">
              <CheckCircle2 size={18} /> Pemeliharaan selesai pada {schedule.completed_at ? new Date(schedule.completed_at).toLocaleString("id-ID") : "-"}
            </p>
          ) : (
            <p className="text-xs text-[#94A3B8] italic">Nama operator, seluruh checklist, dan foto bukti wajib diisi sebelum agenda bisa diselesaikan.</p>
          )}

          {isLocked ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleEditMaintenance}
                disabled={isUnlocking || isDeleting}
                className="flex items-center gap-2 px-6 py-3 bg-[#F1F5F9] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-[#334155] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pencil size={16} /> {isUnlocking ? "Membuka..." : "Edit"}
              </button>
              <button
                onClick={handleDeleteMaintenance}
                disabled={isUnlocking || isDeleting}
                className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-2xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-950/50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} /> {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleCompleteMaintenance}
              className="group flex items-center gap-3 px-10 py-4 bg-[#0D9488] text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-teal-700 active:scale-95 transition-all"
            >
              <CheckCheck size={20} /> Pemeliharaan Selesai
            </button>
          )}
        </div>
      </div>

      {/* LIGHTBOX FOTO */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={lightboxSrc} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" alt="Bukti Pemeliharaan" />
          <button className="absolute top-8 right-8 text-white p-3 hover:bg-white/10 rounded-full transition-all border border-white/20">
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
}