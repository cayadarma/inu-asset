"use client";

import React, { useState } from "react";
import { ChevronDown, User, Mail } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function SettingsPage() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State untuk Toggle (Agar bisa diklik untuk demonstrasi)
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifMaint, setNotifMaint] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifReport, setNotifReport] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto pb-10 font-poppins text-left">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Pengaturan Sistem</h1>
        <p className="text-[#475569] text-sm">Sesuaikan preferensi sistem, data profil, and fungsionalitas manajemen aset</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* KOLOM KIRI */}
        <div className="flex flex-col gap-8">
          
          {/* 1. Profil Pengguna */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] text-base">Profil Pengguna</h3>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-50 shadow-sm">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-bold text-[#0F172A]">Administrator</h4>
                <p className="text-sm text-[#94A3B8] font-medium">admin@inuasset.co.id</p>
                <div className="mt-1">
                  <span className="px-3 py-1 bg-[#CCFBF1] text-[#0D9488] text-[11px] font-bold rounded-md">
                    Super Admin
                  </span>
                </div>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full"></div>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="w-fit px-6 py-2 border border-gray-200 rounded-xl text-sm font-bold text-[#475569] hover:bg-gray-50 transition-all"
            >
              Edit Data Profil
            </button>
          </div>

          {/* 2. Tampilan & Bahasa */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-8">
            <h3 className="font-bold text-[#0F172A] text-base">Tampilan & Bahasa</h3>
            
            <div className="flex flex-col gap-6">
              {/* Dark Mode */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-[#0F172A]">Mode Gelap (Dark Mode)</span>
                  <span className="text-xs text-[#94A3B8]">Gunakan tampilan dengan warna latar belakang gelap</span>
                </div>
                <ToggleSwitch active={darkMode} onToggle={() => setDarkMode(!darkMode)} />
              </div>

              {/* Language */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-[#0F172A]">Bahasa Pengantar</span>
                  <span className="text-xs text-[#94A3B8]">Pilih bahasa pengantar antarmuka aplikasi</span>
                </div>
                <button className="flex items-center gap-3 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-[#475569] hover:bg-gray-50">
                  Bahasa Indonesia <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="flex flex-col gap-8">
          
          {/* 3. Konfigurasi Notifikasi */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-8">
            <h3 className="font-bold text-[#0F172A] text-base">Konfigurasi Notifikasi</h3>
            <div className="flex flex-col gap-6">
              <ToggleRow 
                title="Notifikasi Email" 
                desc="Kirim ringkasan mingguan ke inbox email" 
                active={notifEmail} 
                onToggle={() => setNotifEmail(!notifEmail)} 
              />
              <ToggleRow 
                title="Notifikasi Pemeliharaan" 
                desc="Kirim alarm pengingat kegiatan terjadwal" 
                active={notifMaint} 
                onToggle={() => setNotifMaint(!notifMaint)} 
              />
              <ToggleRow 
                title="Notifikasi Stok Menipis" 
                desc="Beri peringatan saat stok suku cadang reorder level" 
                active={notifStock} 
                onToggle={() => setNotifStock(!notifStock)} 
              />
              <ToggleRow 
                title="Notifikasi Laporan Bulanan" 
                desc="Kirim pesan sistem saat laporan bulanan selesai diproses" 
                active={notifReport} 
                onToggle={() => setNotifReport(!notifReport)} 
              />
            </div>
          </div>

          {/* 4. Sistem & Keamanan */}
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] text-base">Sistem & Keamanan</h3>
            
            <div className="flex flex-col gap-5">
              {/* Backup */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-[#0F172A]">Backup Database</span>
                  <span className="text-xs text-[#94A3B8]">Unduh cadangan data terenkripsi untuk keamanan</span>
                </div>
                <button className="px-4 py-2 bg-[#0D9488] text-white rounded-lg text-[13px] font-bold hover:bg-teal-700 shadow-sm transition-all">
                  Backup Sekarang
                </button>
              </div>

              {/* Cache */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-[#0F172A]">Bersihkan Cache</span>
                  <span className="text-xs text-[#94A3B8]">Optimalkan kecepatan muat dengan bersihkan sisa data</span>
                </div>
                <button className="px-4 py-2 border border-gray-200 text-[#0F172A] rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-all">
                  Clear Cache
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-between items-center text-[11px] text-[#94A3B8] font-medium">
              <span>Versi Aplikasi: v2.1.0 (Enterprise)</span>
              <span>Pembaruan Terakhir: 1 Juli 2024</span>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Edit Profil */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profil Pengguna">
        <form className="flex flex-col gap-5">
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-widest">Nama Lengkap</label>
              <input type="text" defaultValue="Administrator" className="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm font-bold" />
           </div>
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-widest">Alamat Email</label>
              <input type="email" defaultValue="admin@inuasset.co.id" className="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm font-bold" />
           </div>
           <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-[#475569] hover:bg-gray-50">Batal</button>
              <button type="submit" className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-teal-700 shadow-md">Simpan Perubahan</button>
           </div>
        </form>
      </Modal>
    </div>
  );
}

// --- SUB COMPONENTS UNTUK INTERAKTIVITAS ---

function ToggleRow({ title, desc, active, onToggle }: any) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-[#0F172A]">{title}</span>
        <span className="text-xs text-[#94A3B8] font-medium">{desc}</span>
      </div>
      <ToggleSwitch active={active} onToggle={onToggle} />
    </div>
  );
}

function ToggleSwitch({ active, onToggle }: { active: boolean, onToggle: () => void }) {
  return (
    <div 
      onClick={onToggle}
      className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-all duration-300 shadow-inner
        ${active ? 'bg-[#0D9488]' : 'bg-[#E2E8F0]'} 
      `}
    >
      <div 
        className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform
          ${active ? 'translate-x-6' : 'translate-x-0'}
        `}
      ></div>
    </div>
  );
}