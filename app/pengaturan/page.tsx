"use client";

import React, { useState } from "react";
import { ChevronDown, User, Globe, Bell, Check, LoaderCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Lang } from "@/lib/i18n/dictionary";

type NotifKey = "notifEmail" | "notifMaint" | "notifStock" | "notifReport";

export default function SettingsPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { user, setUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // --- Simpan Profil ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);

    const { error } = await supabase
      .from("users")
      .update({ name: profileForm.name, email: profileForm.email })
      .eq("id", user.id);

    setIsSavingProfile(false);

    if (error) {
      showToast("error", t("settings.saveFailed"));
      return;
    }

    const updatedUser = { ...user, name: profileForm.name, email: profileForm.email };
    setUser(updatedUser);
    localStorage.setItem("inu_asset_session", JSON.stringify(updatedUser));
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
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatar_seed || "Felix"}`}
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
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#F8FAFC] shadow-md bg-gray-100 flex items-center justify-center">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatar_seed || "Felix"}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
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
