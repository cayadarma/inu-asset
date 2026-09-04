"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, User, Globe, Bell, Check, LoaderCircle, Camera, ZoomIn } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { resolveAvatarUrl, hashPassword } from "@/lib/auth";
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
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- State penyesuaian ukuran foto (zoom/crop persegi sebelum upload) ---
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const pendingFileRef = useRef<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const CROP_BOX = 240; // ukuran kotak pratinjau (px)
  const OUTPUT_SIZE = 480; // ukuran hasil akhir foto (px)

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
        setIsAdjustOpen(true);
      };
      img.src = objectUrl;
    } catch (err: any) {
      showToast("error", t("settings.saveFailed"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Skala tampilan (cover) dikali zoom, dipakai baik untuk pratinjau maupun render canvas akhir
  const getDisplayScale = (boxSize: number) => {
    if (!naturalSize.w || !naturalSize.h) return 1;
    const baseScale = Math.max(boxSize / naturalSize.w, boxSize / naturalSize.h);
    return baseScale * zoom;
  };

  // --- Terapkan penyesuaian ukuran: render ke canvas persegi, lalu upload ---
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
      const drawW = naturalSize.w * scale;
      const drawH = naturalSize.h * scale;
      const dx = (OUTPUT_SIZE - drawW) / 2;
      const dy = (OUTPUT_SIZE - drawH) / 2;

      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar"))), "image/jpeg", 0.9);
      });

      const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
      const compressedFile = await imageCompression(croppedFile, { maxSizeMB: 0.4, maxWidthOrHeight: 600, useWebWorker: true });

      const fileName = `${Date.now()}-avatar-${user.id}`;
      const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (dbError) throw dbError;

      const updatedUser = { ...user, avatar_url: publicUrl };
      setUser(updatedUser);
      localStorage.setItem("inu_asset_session", JSON.stringify(updatedUser));
      setPreviewUrl(publicUrl);
      setIsAdjustOpen(false);
      if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc(null);
      showToast("success", t("settings.saved"));
    } catch (err: any) {
      showToast("error", t("settings.saveFailed"));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCancelAdjust = () => {
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
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

    const { error } = await supabase.from("users").update(updatePayload).eq("id", user.id);

    setIsSavingProfile(false);

    if (error) {
      showToast("error", t("settings.saveFailed"));
      return;
    }

    const updatedUser = { ...user, name: profileForm.name, email: profileForm.email };
    setUser(updatedUser);
    localStorage.setItem("inu_asset_session", JSON.stringify(updatedUser));
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setIsEditModalOpen(false);
    showToast("success", t("settings.saved"));
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
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("settings.title")}</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">{t("settings.subtitle")}</p>
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
                <img
                  src={resolveAvatarUrl(user)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">{user?.name}</h4>
                <p className="text-sm text-[#94A3B8] font-medium">{user?.email || "-"}</p>
                <div className="mt-1">
                  <span className="px-3 py-1 bg-[#CCFBF1] dark:bg-[#115E59]/30 text-[#0D9488] dark:text-[#CCFBF1] text-[11px] font-bold rounded-md uppercase">
                    {user?.role === "administrator" ? t("settings.role.administrator") : t("settings.role.operator")}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 dark:bg-[#334155] w-full"></div>
            <button
              onClick={() => {
                setProfileForm({ name: user?.name || "", email: user?.email || "" });
                setPasswordForm({ newPassword: "", confirmPassword: "" });
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
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t("settings.editProfile")}>
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          <div className="md:col-span-1 flex flex-col gap-4 items-center">
            <div className="relative w-32 h-32">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#F8FAFC] shadow-md bg-gray-100 flex items-center justify-center">
                <img
                  src={previewUrl || resolveAvatarUrl(user)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              {isUploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <LoaderCircle size={24} className="animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-md hover:bg-[#0B7A70] transition-all disabled:opacity-60"
                title={t("settings.changePhoto")}
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-[#0D9488]">
              {t("settings.changePhoto")}
            </button>
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
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] rounded-xl font-bold text-sm"
              >
                {t("settings.cancel")}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL PENYESUAIAN UKURAN FOTO */}
      <Modal isOpen={isAdjustOpen} onClose={handleCancelAdjust} title={t("settings.adjustPhoto")}>
        <div className="flex flex-col items-center gap-6">
          <div
            className="rounded-full overflow-hidden border-4 border-[#F1F5F9] dark:border-[#334155] bg-gray-100 relative"
            style={{ width: CROP_BOX, height: CROP_BOX }}
          >
            {rawImageSrc && naturalSize.w > 0 && (
              <img
                src={rawImageSrc}
                alt="Pratinjau"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: naturalSize.w * getDisplayScale(CROP_BOX),
                  height: naturalSize.h * getDisplayScale(CROP_BOX),
                  transform: "translate(-50%, -50%)",
                  maxWidth: "none",
                }}
              />
            )}
          </div>

          <div className="w-full flex items-center gap-3">
            <ZoomIn size={18} className="text-[#94A3B8] flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-[#0D9488]"
            />
          </div>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={handleApplyAdjust}
              disabled={isUploadingPhoto}
              className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isUploadingPhoto && <LoaderCircle size={16} className="animate-spin" />}
              {t("settings.save")}
            </button>
            <button
              type="button"
              onClick={handleCancelAdjust}
              disabled={isUploadingPhoto}
              className="flex-1 py-3 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] rounded-xl font-bold text-sm"
            >
              {t("settings.cancel")}
            </button>
          </div>
        </div>
      </Modal>

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