"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, User, Globe, Bell, Check, LoaderCircle, Camera, Plus, Minus, X, RotateCcw } from "lucide-react";
import Modal from "@/components/ui/Modal";
import SettingsTabs from "@/components/layout/SettingsTabs";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { hashPassword, ROLE_LABELS } from "@/lib/auth";
import Avatar from "@/components/ui/Avatar";
import { Lang } from "@/lib/i18n/dictionary";
import imageCompression from "browser-image-compression";

type NotifKey = "notifEmail" | "notifMaint" | "notifStock" | "notifReport";

export default function SettingsPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { user, setUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- State penyesuaian ukuran foto (zoom/crop persegi sebelum upload) ---
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const pendingFileRef = useRef<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // File foto profil hasil crop yang MENUNGGU disimpan (baru benar-benar
  // diupload & disimpan ke database saat tombol "Simpan Perubahan" ditekan).
  const pendingAvatarFileRef = useRef<File | null>(null);
  const [hasPendingAvatarChange, setHasPendingAvatarChange] = useState(false);
  const CROP_BOX = 280; // ukuran kotak pratinjau (px)
  const OUTPUT_SIZE = 480; // ukuran hasil akhir foto (px)

  // --- Geser (drag/pan) posisi gambar di dalam kotak crop, ala WhatsApp ---
  const [position, setPosition] = useState({ x: 0, y: 0 }); // offset (px, pada skala CROP_BOX)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });

  const switches = user?.notification_settings || {
    notifEmail: true,
    notifMaint: true,
    notifStock: true,
    notifReport: false,
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 2500);
  };

  // --- Pilih Foto: buka modal penyesuaian ukuran dulu ---
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      if (file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
        file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
      }

      pendingFileRef.current = file;
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        setRawImageSrc(objectUrl);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setIsAdjustOpen(true);
      };
      img.src = objectUrl;
    } catch (err: any) {
      showToast("error", t("settings.saveFailed"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  // Skala tampilan (cover) dikali zoom, dipakai baik untuk pratinjau maupun render canvas akhir
  const getDisplayScale = (boxSize: number) => {
    if (!naturalSize.w || !naturalSize.h) return 1;
    const baseScale = Math.max(boxSize / naturalSize.w, boxSize / naturalSize.h);
    return baseScale * zoom;
  };

  // Batas geser maksimum (px, skala CROP_BOX) agar gambar tidak lepas dari kotak crop
  const getMaxOffset = (boxSize: number) => {
    const scale = getDisplayScale(boxSize);
    const drawW = naturalSize.w * scale;
    const drawH = naturalSize.h * scale;
    return { x: Math.max(0, (drawW - boxSize) / 2), y: Math.max(0, (drawH - boxSize) / 2) };
  };

  const clampPosition = (pos: { x: number; y: number }) => {
    const max = getMaxOffset(CROP_BOX);
    return {
      x: Math.min(max.x, Math.max(-max.x, pos.x)),
      y: Math.min(max.y, Math.max(-max.y, pos.y)),
    };
  };

  // --- Geser gambar (drag/pan) di dalam kotak crop, mendukung mouse & sentuhan ---
  const handleDragStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    positionStartRef.current = position;
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPosition(clampPosition({ x: positionStartRef.current.x + dx, y: positionStartRef.current.y + dy }));
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(3, Math.max(1, newZoom));
    setZoom(clamped);
  };

  // Setiap kali zoom berubah, pastikan posisi geser masih dalam batas yang valid
  useEffect(() => {
    setPosition((prev) => clampPosition(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, naturalSize.w, naturalSize.h]);

  const handleResetAdjust = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // --- Terapkan penyesuaian ukuran: render ke canvas persegi, simpan sebagai PENDING ---
  // Catatan: foto TIDAK langsung diupload/disimpan ke database di sini.
  // Foto baru hanya berupa pratinjau lokal (belum permanen) sampai user menekan
  // tombol "Simpan Perubahan" pada form profil (handleSaveProfile).
  const handleApplyAdjust = async () => {
    if (!rawImageSrc || !user || !pendingFileRef.current) return;

    setIsUploadingPhoto(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = rawImageSrc;
      });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas tidak tersedia");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Konteks canvas tidak tersedia");

      const scale = getDisplayScale(OUTPUT_SIZE);
      const outputScaleRatio = OUTPUT_SIZE / CROP_BOX;
      const drawW = naturalSize.w * scale;
      const drawH = naturalSize.h * scale;
      const dx = (OUTPUT_SIZE - drawW) / 2 + position.x * outputScaleRatio;
      const dy = (OUTPUT_SIZE - drawH) / 2 + position.y * outputScaleRatio;

      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar"))), "image/jpeg", 0.9);
      });

      const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
      const compressedFile = await imageCompression(croppedFile, { maxSizeMB: 0.4, maxWidthOrHeight: 600, useWebWorker: true });

      // Simpan file hasil crop sebagai PENDING (belum diupload ke storage/db).
      // Bersihkan preview blob lama (jika ada) sebelum menggantinya dengan yang baru.
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      pendingAvatarFileRef.current = compressedFile;
      setPreviewUrl(URL.createObjectURL(compressedFile));
      setHasPendingAvatarChange(true);

      setIsAdjustOpen(false);
      if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
      pendingFileRef.current = null;
    } catch (err: any) {
      showToast("error", t("settings.saveFailed"));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCancelAdjust = () => {
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
    setPosition({ x: 0, y: 0 });
    setIsAdjustOpen(false);
  };

  // --- Simpan Profil (nama, email, dan password baru jika diisi) ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validasi password baru (jika diisi)
    if (passwordForm.newPassword || passwordForm.confirmPassword) {
      if (passwordForm.newPassword.length < 6) {
        showToast("error", t("settings.passwordTooShort"));
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showToast("error", t("settings.passwordMismatch"));
        return;
      }
    }

    setIsSavingProfile(true);

    const updatePayload: Record<string, any> = {
      name: profileForm.name,
      email: profileForm.email,
    };

    if (passwordForm.newPassword) {
      updatePayload.password_hash = await hashPassword(passwordForm.newPassword);
    }

    // --- Jika ada foto profil baru yang masih PENDING, upload sekarang ---
    // Ini satu-satunya titik di mana foto profil benar-benar disimpan permanen.
    let newAvatarUrl: string | null = null;
    if (pendingAvatarFileRef.current) {
      try {
        const fileName = `${Date.now()}-avatar-${user.id}`;
        const { error: uploadError } = await supabase.storage
          .from("asset-images")
          .upload(fileName, pendingAvatarFileRef.current);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
        newAvatarUrl = publicUrl;
        updatePayload.avatar_url = publicUrl;
      } catch (err: any) {
        setIsSavingProfile(false);
        showToast("error", t("settings.saveFailed"));
        return;
      }
    }

    const { error } = await supabase.from("users").update(updatePayload).eq("id", user.id);

    setIsSavingProfile(false);

    if (error) {
      showToast("error", t("settings.saveFailed"));
      return;
    }

    const updatedUser = {
      ...user,
      name: profileForm.name,
      email: profileForm.email,
      ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
    };
    setUser(updatedUser);
    localStorage.setItem("inu_asset_session", JSON.stringify(updatedUser));
    setPasswordForm({ newPassword: "", confirmPassword: "" });

    // Bersihkan state pending foto setelah berhasil disimpan
    pendingAvatarFileRef.current = null;
    setHasPendingAvatarChange(false);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    setIsEditModalOpen(false);
    showToast("success", t("settings.saved"));
  };

  // --- Batal edit profil: buang perubahan foto yang belum disimpan ---
  const handleCancelEditProfile = () => {
    pendingAvatarFileRef.current = null;
    setHasPendingAvatarChange(false);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsEditModalOpen(false);
  };

  // --- Ganti Bahasa ---
  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Lang;
    await setLang(newLang);
  };

  // --- Toggle Notifikasi (langsung tersimpan ke database) ---
  const toggleNotif = async (key: NotifKey) => {
    if (!user) return;
    const updatedSettings = { ...switches, [key]: !switches[key] };
    const updatedUser = { ...user, notification_settings: updatedSettings };

    // Optimistic update
    setUser(updatedUser);
    localStorage.setItem("inu_asset_session", JSON.stringify(updatedUser));

    const { error } = await supabase
      .from("users")
      .update({ notification_settings: updatedSettings })
      .eq("id", user.id);

    if (error) {
      // Rollback kalau gagal
      setUser(user);
      localStorage.setItem("inu_asset_session", JSON.stringify(user));
      showToast("error", t("settings.saveFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto pb-10 font-poppins text-left transition-colors duration-300 relative">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white flex items-center gap-2 ${
            toastMsg.type === "success" ? "bg-[#0D9488]" : "bg-red-500"
          }`}
        >
          {toastMsg.type === "success" && <Check size={16} />} {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("settings.title")}</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">{t("settings.subtitle")}</p>
        </div>
        <SettingsTabs active="profil" role={user?.role} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* KOLOM KIRI */}
        <div className="flex flex-col gap-8">
          {/* Card Profil Pengguna */}
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base flex items-center gap-2">
              <User size={18} className="text-[#0D9488]" /> {t("settings.profile")}
            </h3>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#F1F5F9] dark:border-[#334155] shadow-sm">
                <Avatar name={user?.name || ""} avatarUrl={user?.avatar_url} size={80} className="w-full h-full" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{user?.name}</h4>
                <p className="text-sm text-[#94A3B8] font-medium">{user?.email || "-"}</p>
                <div className="mt-1">
                  <span className="px-3 py-1 bg-[#CCFBF1] dark:bg-[#115E59]/30 text-[#0D9488] dark:text-[#CCFBF1] text-[11px] font-bold rounded-md uppercase">
                    {user?.role ? ROLE_LABELS[user.role] : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 dark:bg-[#334155] w-full"></div>
            <button
              onClick={() => {
                setProfileForm({ name: user?.name || "", email: user?.email || "" });
                setPasswordForm({ newPassword: "", confirmPassword: "" });
                pendingAvatarFileRef.current = null;
                setHasPendingAvatarChange(false);
                setPreviewUrl(null);
                setIsEditModalOpen(true);
              }}
              className="w-fit px-6 py-2.5 border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155] transition-all"
            >
              {t("settings.editProfile")}
            </button>
          </div>

          {/* Card Tampilan & Bahasa */}
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-8">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base flex items-center gap-2">
              <Globe size={18} className="text-[#0D9488]" /> {t("settings.displayLang")}
            </h3>
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("settings.darkMode")}</span>
                  <span className="text-xs text-[#94A3B8]">{t("settings.darkModeDesc")}</span>
                </div>
                <ToggleSwitch active={isDarkMode} onToggle={toggleTheme} />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("settings.language")}</span>
                  <span className="text-xs text-[#94A3B8]">{t("settings.languageDesc")}</span>
                </div>
                <div className="relative">
                  <select
                    value={lang}
                    onChange={handleLanguageChange}
                    className="appearance-none pl-4 pr-10 py-2 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-[#0D9488]"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English (US)</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="flex flex-col gap-8">
          {/* Konfigurasi Notifikasi */}
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-8">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base flex items-center gap-2">
              <Bell size={18} className="text-[#0D9488]" /> {t("settings.notifConfig")}
            </h3>
            <div className="flex flex-col gap-6">
              <ToggleRow
                title={t("settings.notifEmail")}
                desc={t("settings.notifEmailDesc")}
                active={switches.notifEmail}
                onToggle={() => toggleNotif("notifEmail")}
              />
              <ToggleRow
                title={t("settings.notifMaint")}
                desc={t("settings.notifMaintDesc")}
                active={switches.notifMaint}
                onToggle={() => toggleNotif("notifMaint")}
              />
              <ToggleRow
                title={t("settings.notifStock")}
                desc={t("settings.notifStockDesc")}
                active={switches.notifStock}
                onToggle={() => toggleNotif("notifStock")}
              />
            </div>
            <p className="text-xs text-[#94A3B8] italic">{t("notif.disabledHint")}</p>
          </div>
        </div>
      </div>

      {/* MODAL EDIT PROFIL */}
      <Modal isOpen={isEditModalOpen} onClose={handleCancelEditProfile} title={t("settings.editProfile")}>
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          <div className="md:col-span-1 flex flex-col gap-4 items-center">
            <div className="relative w-32 h-32">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#F8FAFC] shadow-md bg-gray-100 flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Avatar name={user?.name || ""} avatarUrl={user?.avatar_url} size={128} className="w-full h-full" />
                )}
              </div>
              {isUploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <LoaderCircle size={24} className="animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-md hover:bg-[#0B7A70] transition-all disabled:opacity-60"
                title={t("settings.changePhoto")}
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-[#0D9488]">
                {t("settings.changePhoto")}
              </button>
              <span className="text-[#CBD5E1]">·</span>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="text-xs font-bold text-[#0D9488]">
                Kamera
              </button>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("settings.fullName")}</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                required
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("settings.email")}</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
              />
            </div>

            <div className="h-[1px] bg-gray-100 dark:bg-[#334155] w-full"></div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("settings.newPassword")}</label>
              <span className="text-xs text-[#94A3B8]">{t("settings.newPasswordDesc")}</span>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder={t("settings.newPassword")}
                autoComplete="new-password"
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder={t("settings.confirmPassword")}
                autoComplete="new-password"
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSavingProfile && <LoaderCircle size={16} className="animate-spin" />}
                {t("settings.save")}
              </button>
              <button
                type="button"
                onClick={handleCancelEditProfile}
                className="flex-1 py-3 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] rounded-xl font-bold text-sm"
              >
                {t("settings.cancel")}
              </button>
            </div>
            {hasPendingAvatarChange && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium -mt-2">
                {t("settings.photoPendingHint")}
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL PENYESUAIAN UKURAN FOTO — gaya seperti WhatsApp: layar penuh gelap, bisa digeser & dizoom */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-[300] bg-[#111B21] flex flex-col select-none">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={handleCancelAdjust}
              disabled={isUploadingPhoto}
              className="text-white p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-60"
              title={t("settings.cancel")}
            >
              <X size={22} />
            </button>
            <h2 className="text-white text-sm sm:text-base font-medium flex-1 text-center px-2 truncate">
              {t("settings.dragToAdjust")}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetAdjust}
                disabled={isUploadingPhoto}
                className="text-white p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-60"
                title={t("settings.resetAdjust")}
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* Area gambar (bisa digeser) */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <div
              className="relative overflow-hidden bg-black touch-none"
              style={{ width: CROP_BOX, height: CROP_BOX, cursor: isUploadingPhoto ? "default" : "grab" }}
              onMouseDown={(e) => {
                if (isUploadingPhoto) return;
                e.preventDefault();
                handleDragStart(e.clientX, e.clientY);
              }}
              onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => {
                if (isUploadingPhoto) return;
                const touch = e.touches[0];
                handleDragStart(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                handleDragMove(touch.clientX, touch.clientY);
              }}
              onTouchEnd={handleDragEnd}
            >
              {rawImageSrc && naturalSize.w > 0 && (
                <img
                  src={rawImageSrc}
                  alt="Pratinjau"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: naturalSize.w * getDisplayScale(CROP_BOX),
                    height: naturalSize.h * getDisplayScale(CROP_BOX),
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                    maxWidth: "none",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Overlay gelap dengan lubang bundar di tengah (area yang akan jadi foto profil) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: `0 0 0 9999px rgba(17,27,33,0.75)`,
                  borderRadius: "9999px",
                  width: CROP_BOX,
                  height: CROP_BOX,
                }}
              />
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.7)" }}
              />
            </div>
          </div>

          {/* Kontrol Zoom +/- */}
          <div className="flex items-center justify-center gap-4 pb-4">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.2)}
              disabled={isUploadingPhoto}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-40"
              title={t("settings.zoomOut")}
            >
              <Minus size={18} />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-40 accent-[#25D366]"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.2)}
              disabled={isUploadingPhoto}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-40"
              title={t("settings.zoomIn")}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Tombol Batal & Konfirmasi */}
          <div className="flex items-center justify-between px-6 pb-8 sm:pb-10">
            <button
              type="button"
              onClick={handleCancelAdjust}
              disabled={isUploadingPhoto}
              className="px-5 py-3 text-white/80 font-bold text-sm rounded-xl hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              {t("settings.cancel")}
            </button>
            <button
              type="button"
              onClick={handleApplyAdjust}
              disabled={isUploadingPhoto}
              className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:bg-[#1FBF5C] transition-colors disabled:opacity-60"
              title={t("settings.confirmAdjust")}
            >
              {isUploadingPhoto ? <LoaderCircle size={22} className="animate-spin" /> : <Check size={24} strokeWidth={3} />}
            </button>
          </div>
        </div>
      )}

      {/* Canvas tersembunyi untuk merender hasil crop */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// --- SUB COMPONENTS ---
function ToggleRow({ title, desc, active, onToggle }: any) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{title}</span>
        <span className="text-xs text-[#94A3B8]">{desc}</span>
      </div>
      <ToggleSwitch active={active} onToggle={onToggle} />
    </div>
  );
}

function ToggleSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-all duration-300 shadow-inner ${
        active ? "bg-[#0D9488]" : "bg-[#E2E8F0] dark:bg-[#334155]"
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform ${
          active ? "translate-x-6" : "translate-x-0"
        }`}
      ></div>
    </div>
  );
}