"use client";

import React, { useState } from "react";
import { 
  ChevronDown, User, Globe, Bell
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useTheme } from "../../context/ThemeContext";

export default function SettingsPage() {
  const { isDarkMode, toggleTheme } = useTheme();

  // --- STATE DATA ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State Switch Notifikasi
  const [switches, setSwitches] = useState({
    notifEmail: true,
    notifMaint: true,
    notifStock: true,
    notifReport: false,
  });

  const toggleNotif = (key: keyof typeof switches) => {
    setSwitches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto pb-10 font-poppins text-left transition-colors duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pengaturan Sistem</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Kelola preferensi sistem dan keamanan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* KOLOM KIRI */}
        <div className="flex flex-col gap-8">
          {/* Card Profil Pengguna */}
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base flex items-center gap-2">
               <User size={18} className="text-[#0D9488]" /> Profil Pengguna
            </h3>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#F1F5F9] dark:border-[#334155] shadow-sm">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Administrator</h4>
                <p className="text-sm text-[#94A3B8] font-medium">admin@inuasset.co.id</p>
                <div className="mt-1"><span className="px-3 py-1 bg-[#CCFBF1] dark:bg-[#115E59]/30 text-[#0D9488] dark:text-[#CCFBF1] text-[11px] font-bold rounded-md uppercase">Super Admin</span></div>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 dark:bg-[#334155] w-full"></div>
            <button onClick={() => setIsEditModalOpen(true)} className="w-fit px-6 py-2.5 border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155] transition-all">
              Edit Data Profil
            </button>
          </div>

          {/* Card Tampilan & Bahasa */}
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-8">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base flex items-center gap-2">
               <Globe size={18} className="text-[#0D9488]" /> Tampilan & Bahasa
            </h3>
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Mode Gelap (Dark Mode)</span>
                  <span className="text-xs text-[#94A3B8]">Gunakan tampilan dengan warna latar belakang gelap</span>
                </div>
                <ToggleSwitch active={isDarkMode} onToggle={toggleTheme} />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Bahasa Pengantar</span>
                  <span className="text-xs text-[#94A3B8]">Pilih bahasa antarmuka aplikasi</span>
                </div>
                <div className="relative">
                  <select className="appearance-none pl-4 pr-10 py-2 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-[#0D9488]">
                    <option>Bahasa Indonesia</option><option>English (US)</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
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
               <Bell size={18} className="text-[#0D9488]" /> Konfigurasi Notifikasi
            </h3>
            <div className="flex flex-col gap-6">
              <ToggleRow title="Notifikasi Email" desc="Kirim ringkasan mingguan" active={switches.notifEmail} onToggle={() => toggleNotif('notifEmail')} />
              <ToggleRow title="Notifikasi Pemeliharaan" desc="Alarm pengingat jadwal" active={switches.notifMaint} onToggle={() => toggleNotif('notifMaint')} />
              <ToggleRow title="Notifikasi Stok Menipis" desc="Peringatan reorder level" active={switches.notifStock} onToggle={() => toggleNotif('notifStock')} />
            </div>
          </div>
        </div>

      </div>

      {/* MODAL EDIT PROFIL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profil Pengguna">
        <form className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
           <div className="md:col-span-1 flex flex-col gap-4 items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#F8FAFC] shadow-md bg-gray-100 flex items-center justify-center">
                 <User size={48} className="text-gray-300" />
              </div>
              <button type="button" className="text-xs font-bold text-[#0D9488]">Ganti Foto</button>
           </div>
           <div className="md:col-span-2 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                 <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Nama Lengkap</label>
                 <input type="text" defaultValue="Administrator" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white" />
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Alamat Email</label>
                 <input type="email" defaultValue="admin@inuasset.co.id" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-[#0D9488] dark:text-white" />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md">Simpan Perubahan</button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] rounded-xl font-bold text-sm">Batal</button>
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

function ToggleSwitch({ active, onToggle }: { active: boolean, onToggle: () => void }) {
  return (
    <div onClick={onToggle} className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-all duration-300 shadow-inner ${active ? 'bg-[#0D9488]' : 'bg-[#E2E8F0] dark:bg-[#334155]'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </div>
  );
}