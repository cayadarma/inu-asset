"use client";

import React, { useState, use, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Printer, Wrench, Image as ImageIcon,
  Camera, X, CheckCircle2, ZoomIn, Trash2
} from "lucide-react";
import imageCompression from "browser-image-compression";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

interface WorkOrder {
  id: string;
  tgl: string;
  kategori: string;
  asset_id: string;
  trouble: string;
  tindak_lanjut: string | null;
  tech_name: string | null;
  supervisor: string | null;
  priority: string;
  cost_part: number;
  cost_service: number;
  status: string;
  actual_cost: number | null;
  proof_photo_url: string | null;
  updated_at: string | null;
  completed_at: string | null;
  created_at: string;
  assets: {
    name: string;
    type: string;
    location_id: string;
    locations: { name: string } | null;
  } | null;
}

interface WorkOrderUpdate {
  id: string;
  work_order_id: string;
  status: string;
  keterangan: string | null;
  biaya: number;
  proof_photo_url: string | null;
  created_at: string;
}

// --- FORMAT ANGKA JADI FORMAT RIBUAN ID (TITIK SEBAGAI PEMISAH) ---
const formatRibuan = (value: number) => (value ? value.toLocaleString("id-ID") : "");
const parseRibuan = (value: string) => Number(value.replace(/\D/g, "")) || 0;

export default function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [updates, setUpdates] = useState<WorkOrderUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATE MODAL PERBARUI STATUS PERBAIKAN ---
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    tindak_lanjut: "",
    keterangan: "Dalam Proses",
    biaya: 0,
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  const isLocked = workOrder?.status === "Selesai";

  const fetchDetail = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("work_orders")
      .select(`*, assets ( name, type, location_id, locations ( name ) )`)
      .eq("id", id)
      .maybeSingle();

    if (data) setWorkOrder(data as any);
    setIsLoading(false);
  };

  // --- AMBIL SEMUA RIWAYAT UPDATE PERBAIKAN (BUKAN HANYA YANG TERBARU) ---
  const fetchUpdates = async () => {
    const { data } = await supabase
      .from("work_order_updates")
      .select("*")
      .eq("work_order_id", id)
      .order("created_at", { ascending: false });

    if (data) setUpdates(data as WorkOrderUpdate[]);
  };

  useEffect(() => {
    fetchDetail();
    fetchUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- JUDUL TAB BROWSER MENGIKUTI NAMA ASET ---
  useEffect(() => {
    if (workOrder?.assets?.name) {
      document.title = `Work Order — ${workOrder.assets.name}`;
    }
  }, [workOrder?.assets?.name]);

  const resetUpdateForm = () => {
    setUpdateForm({ tindak_lanjut: "", keterangan: "Dalam Proses", biaya: 0 });
    setPhotoUrl("");
  };

  const openUpdateModal = () => {
    resetUpdateForm();
    setIsUpdateModalOpen(true);
  };

  // --- UPLOAD FOTO BUKTI PERBAIKAN ---
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      if (file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
        file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
      }
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1200, useWebWorker: true });

      const fileName = `${Date.now()}-wo-${id}`;
      const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
      setPhotoUrl(publicUrl);
    } catch (err: any) {
      alert("Gagal mengunggah foto: " + (err?.message || "Terjadi kesalahan"));
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- SIMPAN PEMBARUAN PERBAIKAN (BISA DIPAKSA STATUS "Selesai") ---
  const handleSaveUpdate = async (forceStatus?: string) => {
    if (!workOrder) return;

    const isFinishing = forceStatus === "Selesai";

    // --- VALIDASI: STATUS WAJIB, FOTO WAJIB UNTUK SETIAP PENYIMPANAN ---
    if (!updateForm.keterangan.trim()) {
      alert("Status perbaikan wajib dipilih.");
      return;
    }
    if (!photoUrl) {
      alert("Foto bukti perbaikan wajib diunggah.");
      return;
    }
    // --- VALIDASI TAMBAHAN: BIAYA WAJIB DIISI KHUSUS SAAT MENYELESAIKAN PERBAIKAN ---
    if (isFinishing && (!updateForm.biaya || updateForm.biaya <= 0)) {
      alert("Biaya yang dikeluarkan wajib diisi untuk menyelesaikan perbaikan.");
      return;
    }

    const finalKeterangan = forceStatus || updateForm.keterangan;

    if (isFinishing && !confirm("Yakin ingin menyelesaikan perbaikan ini?")) {
      return;
    }

    // --- GABUNGKAN TINDAKAN BARU DENGAN TINDAK LANJUT YANG SUDAH ADA ---
    const stamp = new Date().toLocaleString("id-ID");
    const entry = `[${stamp}] ${updateForm.tindak_lanjut.trim()}`;
    const mergedTindakLanjut = workOrder.tindak_lanjut
      ? `${workOrder.tindak_lanjut}\n${entry}`
      : entry;

    setIsSaving(true);

    const nowIso = new Date().toISOString();

    // --- SIMPAN SEBAGAI RIWAYAT BARU (TIDAK MENIMPA UPDATE SEBELUMNYA) ---
    const { error: historyError } = await supabase.from("work_order_updates").insert([{
      work_order_id: id,
      status: finalKeterangan,
      keterangan: updateForm.tindak_lanjut.trim(),
      biaya: updateForm.biaya || 0,
      proof_photo_url: photoUrl,
      created_at: nowIso,
    }]);

    if (historyError) {
      alert("Gagal menyimpan riwayat pembaruan perbaikan: " + historyError.message);
      setIsSaving(false);
      return;
    }

    // --- PERBARUI SNAPSHOT TERBARU DI WORK ORDER (STATUS, TOTAL BIAYA, FOTO TERAKHIR) ---
    const totalBiayaBaru = (workOrder.actual_cost || 0) + (updateForm.biaya || 0);
    const updatePayload: any = {
      status: finalKeterangan,
      tindak_lanjut: mergedTindakLanjut,
      actual_cost: totalBiayaBaru,
      proof_photo_url: photoUrl,
      updated_at: nowIso,
    };
    if (isFinishing) {
      updatePayload.completed_at = nowIso;
    }

    const { error } = await supabase.from("work_orders").update(updatePayload).eq("id", id);

    if (error) {
      alert("Gagal menyimpan pembaruan perbaikan: " + error.message);
      setIsSaving(false);
      return;
    }

    // --- KEMBALIKAN STATUS ASET KE BEROPERASI SAAT PERBAIKAN SELESAI ---
    if (isFinishing) {
      await supabase.from("assets").update({ status: "Beroperasi" }).eq("id", workOrder.asset_id);
    }

    setIsSaving(false);
    setIsUpdateModalOpen(false);
    resetUpdateForm();
    fetchDetail();
    fetchUpdates();
  };

  // --- HAPUS WORK ORDER DARI DATABASE ---
  const handleDeleteWorkOrder = async () => {
    if (!workOrder) return;
    if (!confirm("Yakin ingin menghapus work order ini secara permanen? Semua riwayat perbaikan yang terkait juga akan terhapus.")) {
      return;
    }

    setIsDeleting(true);

    // --- HAPUS RIWAYAT TERKAIT TERLEBIH DAHULU (JAGA-JAGA JIKA TIDAK ADA CASCADE DI DATABASE) ---
    await supabase.from("work_order_updates").delete().eq("work_order_id", id);

    const { error } = await supabase.from("work_orders").delete().eq("id", id);

    if (error) {
      alert("Gagal menghapus work order: " + error.message);
      setIsDeleting(false);
      return;
    }

    router.push("/pemeliharaan/korektif");
  };

  const openLightbox = (src: string | null) => {
    if (!src) return;
    setLightboxSrc(src);
    setIsLightboxOpen(true);
  };

  if (isLoading) return <div className="p-20 text-center font-bold dark:text-white font-poppins">Memuat detail work order...</div>;
  if (!workOrder) return <div className="p-20 text-center text-red-500 font-bold font-poppins">Work order tidak ditemukan.</div>;

  const totalEstimasi = (workOrder.cost_part || 0) + (workOrder.cost_service || 0);

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left max-w-[900px] mx-auto">
      {/* TOMBOL KEMBALI */}
      <Link
        href="/pemeliharaan/korektif"
        className="flex items-center gap-2 text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:text-[#0D9488] transition-all w-fit group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Kembali ke Pemeliharaan Korektif
      </Link>

      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Detail Work Order — {workOrder.id}</h1>
          <Badge status={workOrder.status} />
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-sm text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 flex items-center gap-2">
            <Printer size={18} /> Cetak WO
          </button>
          {!isLocked && (
            <button
              onClick={openUpdateModal}
              className="px-5 py-2.5 bg-[#0D9488] text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-md"
            >
              Perbarui Status Perbaikan
            </button>
          )}
        </div>
      </div>

      {/* 2. DETAIL WORK ORDER */}
      <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
        <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg border-b border-gray-100 dark:border-[#334155] pb-4">Detail Work Order</h3>
        <div className="flex flex-col gap-5">
          <RowItem
            label="Tanggal Terbit"
            value={workOrder.tgl ? new Date(workOrder.tgl + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
          />
          <RowItem label="Kode Aset" value={`${workOrder.asset_id}${workOrder.assets?.name ? ` — ${workOrder.assets.name}` : ""}`} />
          <RowItem label="Jenis Barang" value={workOrder.assets?.type || "-"} />
          <RowItem label="Kategori" value={workOrder.kategori || "-"} />
          <RowItem label="Pengawas" value={workOrder.supervisor || "-"} />
          <RowItem label="Pelaksana" value={workOrder.tech_name || "-"} />

          <div className="flex flex-col gap-2 mt-2">
            <span className="text-xs font-bold text-[#94A3B8] uppercase">Masalah (Trouble)</span>
            <p className="text-[15px] text-[#0F172A] dark:text-[#F8FAFC] font-bold">
              {workOrder.trouble || "-"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#94A3B8] uppercase">Tindakan Perbaikan (Tindak Lanjut)</span>
            <p className="text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed bg-[#F8FAFC] dark:bg-[#0F172A] p-5 rounded-xl border border-gray-100 dark:border-[#334155] whitespace-pre-line">
              {workOrder.tindak_lanjut?.trim() ? workOrder.tindak_lanjut : "Belum ada tindakan perbaikan tercatat."}
            </p>
          </div>

          {/* TOTAL ESTIMASI BIAYA */}
          <div className="mt-2 p-4 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-2xl border border-dashed border-[#0D9488]/30 flex justify-between items-center shadow-sm">
            <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-tighter">Total Estimasi Biaya</span>
            <span className="text-sm font-black text-[#0D9488]">Rp {totalEstimasi.toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

      {/* 3. RIWAYAT UPDATE PERBAIKAN (SEMUA UPDATE TETAP TAMPIL, BUKAN HANYA TERBARU) */}
      {updates.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg flex items-center gap-2 px-1">
            <Wrench size={18} className="text-[#0D9488]" /> Riwayat Update Perbaikan
            <span className="text-xs font-bold text-[#94A3B8]">({updates.length})</span>
          </h3>

          {updates.map((u, index) => (
            <div
              key={u.id}
              className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#334155] pb-4">
                <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">
                  Update #{updates.length - index} — {new Date(u.created_at).toLocaleString("id-ID")}
                </h4>
                <Badge status={u.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-[#94A3B8] uppercase">Keterangan</span>
                    <p className="text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed whitespace-pre-line">
                      {u.keterangan || "-"}
                    </p>
                  </div>
                  <RowItem label="Biaya Dikeluarkan" value={`Rp ${(u.biaya || 0).toLocaleString("id-ID")}`} />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#94A3B8] uppercase flex items-center gap-1">
                    <ImageIcon size={14} /> Foto Bukti Perbaikan
                  </span>
                  {u.proof_photo_url ? (
                    <div className="relative group w-full">
                      <img
                        src={u.proof_photo_url}
                        onClick={() => openLightbox(u.proof_photo_url)}
                        className="w-full aspect-video object-cover rounded-xl border border-gray-200 dark:border-[#334155] cursor-zoom-in"
                        alt="Bukti Perbaikan"
                      />
                      <button
                        type="button"
                        onClick={() => openLightbox(u.proof_photo_url)}
                        className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Perbesar foto"
                      >
                        <ZoomIn size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-xl border border-dashed border-gray-200 dark:border-[#334155] flex items-center justify-center text-[#94A3B8] text-xs italic">
                      Belum ada foto
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL PERBARUI STATUS PERBAIKAN */}
      <Modal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title="Perbarui Status Perbaikan">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Keterangan Perbaikan
            </label>
            <textarea
              rows={3}
              value={updateForm.tindak_lanjut}
              onChange={(e) => setUpdateForm({ ...updateForm, tindak_lanjut: e.target.value })}
              placeholder="Jelaskan tindakan atau perkembangan perbaikan yang dilakukan... (Opsional)"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none bg-white dark:bg-[#0F172A] dark:text-white font-medium"
            />
            <span className="text-[11px] text-[#94A3B8] italic">Opsional. Tambahkan catatan pendukung jika diperlukan.</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={updateForm.keterangan}
              onChange={(e) => setUpdateForm({ ...updateForm, keterangan: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white"
            >
              <option value="">-- Pilih Status --</option>
              <option value="Dalam Proses">Dalam Proses</option>
              <option value="Menunggu Part">Menunggu Suku Cadang</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Foto Bukti Perbaikan <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="hidden"
              accept=".jpg,.jpeg,.png,.heic,.webp"
            />
            <div className="flex items-center gap-3">
              {photoUrl && (
                <div className="relative group">
                  <img src={photoUrl} className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-[#334155]" alt="Pratinjau Foto Bukti" />
                  <button
                    type="button"
                    onClick={() => openLightbox(photoUrl)}
                    title="Lihat resolusi asli"
                    className="absolute -top-2 -right-2 p-1.5 bg-[#0D9488] text-white rounded-full shadow-md hover:bg-teal-700 transition-all"
                  >
                    <ZoomIn size={12} />
                  </button>
                </div>
              )}
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#F1F5F9] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-200 dark:hover:bg-[#334155] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={16} />
                {isUploadingPhoto ? "Mengunggah..." : photoUrl ? "Ganti Foto" : "Unggah Foto"}
              </button>
            </div>
            {photoUrl && (
              <span className="text-[11px] text-[#94A3B8] italic">Klik ikon kaca pembesar untuk melihat foto dalam resolusi asli.</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
              Biaya yang Dikeluarkan (Rp)
              {updateForm.keterangan === "Selesai" && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatRibuan(updateForm.biaya)}
              onChange={(e) => setUpdateForm({ ...updateForm, biaya: parseRibuan(e.target.value) })}
              placeholder="0"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white font-bold"
            />
            <span className="text-[11px] text-[#94A3B8] italic">Wajib diisi saat menyelesaikan perbaikan.</span>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveUpdate()}
              className="w-full bg-[#0D9488] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan..." : "Simpan Pembaruan Perbaikan"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveUpdate("Selesai")}
              className="w-full flex items-center justify-center gap-2 bg-[#10B981] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={18} /> {isSaving ? "Menyimpan..." : "Selesaikan Perbaikan"}
            </button>
            <button
              type="button"
              onClick={() => { setIsUpdateModalOpen(false); resetUpdateForm(); }}
              className="text-[#475569] dark:text-[#94A3B8] text-sm font-bold hover:underline text-center transition-all"
            >
              Batalkan
            </button>
          </div>
        </div>
      </Modal>

      {/* LIGHTBOX FOTO */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img src={lightboxSrc} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" alt="Bukti Perbaikan" />
          <button className="absolute top-8 right-8 text-white p-3 hover:bg-white/10 rounded-full transition-all border border-white/20">
            <X size={32} />
          </button>
        </div>
      )}

      {/* 5. HAPUS WORK ORDER (PALING BAWAH) */}
      <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-dashed border-red-200 dark:border-red-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-red-600 text-sm">Hapus Work Order</h3>
          <p className="text-xs text-[#94A3B8]">
            Tindakan ini akan menghapus work order beserta seluruh riwayat perbaikannya secara permanen dari database.
          </p>
        </div>
        <button
          type="button"
          disabled={isDeleting}
          onClick={handleDeleteWorkOrder}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Trash2 size={16} /> {isDeleting ? "Menghapus..." : "Hapus Work Order"}
        </button>
      </div>
    </div>
  );
}

function RowItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center">
      <span className="w-40 text-xs font-bold text-[#94A3B8] uppercase">{label}</span>
      <span className="text-sm text-[#0F172A] dark:text-[#F8FAFC] font-bold">{value}</span>
    </div>
  );
}