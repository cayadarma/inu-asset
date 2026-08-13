"use client"; // Wajib untuk interaksi

import React, { useState } from "react";
import { User, Globe, Bell, Shield, Database, Trash2, ChevronRight, Mail, Lock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function SettingsPage() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // State untuk Toggle (Poin 14)
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifMaint, setNotifMaint] = useState(true);
  const [notifStock, setNotifStock] = useState(false);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] mx-auto pb-10">
      <h1 className="text-2xl font-bold text-[#0F172A]">Pengaturan Sistem</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
          {/* Card Profil */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
            <h3 className="font-bold text-[#0F172A] flex items-center gap-2"><User size={18} className="text-[#0D9488]" /> Profil Pengguna</h3>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#F8FAFC] shadow-sm">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-bold text-[#0F172A]">Administrator</h4>
                <p className="text-sm text-[#94A3B8]">admin@inuasset.co.id</p>
                <div className="mt-1 flex gap-2"><Badge status="Aktif" /><span className="text-[11px] font-bold text-[#0D9488] bg-[#CCFBF1] px-2 py-0.5 rounded">Super Admin</span></div>
              </div>
            </div>
            <button onClick={() => setIsEditModalOpen(true)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-[#475569] hover:bg-gray-50">
              Edit Data Profil
            </button>
          </div>
        </div>

        {/* Card Notifikasi (Poin 14) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
          <h3 className="font-bold text-[#0F172A] flex items-center gap-2"><Bell size={18} className="text-[#0D9488]" /> Konfigurasi Notifikasi</h3>
          <div className="flex flex-col gap-5">
            <ToggleItem title="Notifikasi Email" desc="Kirim ringkasan mingguan" active={notifEmail} onToggle={() => setNotifEmail(!notifEmail)} />
            <ToggleItem title="Notifikasi Pemeliharaan" desc="Alarm pengingat jadwal" active={notifMaint} onToggle={() => setNotifMaint(!notifMaint)} />
            <ToggleItem title="Notifikasi Stok Menipis" desc="Peringatan reorder level" active={notifStock} onToggle={() => setNotifStock(!notifStock)} />
          </div>
        </div>
      </div>

      {/* MODAL EDIT PROFIL (POIN 13) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profil Pengguna">
        <form className="flex flex-col gap-5">
           <div className="flex flex-col items-center gap-4 mb-4">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                 <User size={32} />
              </div>
              <button type="button" className="text-xs font-bold text-[#0D9488]">Ganti Foto Profil</button>
           </div>
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" defaultValue="Administrator" className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm" />
              </div>
           </div>
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase">Alamat Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="email" defaultValue="admin@inuasset.co.id" className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl outline-none focus:border-primary text-sm" />
              </div>
           </div>
           <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-[#475569] hover:bg-gray-50 text-sm">Batal</button>
              <button type="submit" className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:opacity-90 shadow-md text-sm">Simpan Profil</button>
           </div>
        </form>
      </Modal>
    </div>
  );
}

function ToggleItem({ title, desc, active, onToggle }: { title: string, desc: string, active: boolean, onToggle: () => void }) {
  return (
    <div className="flex justify-between items-center group" onClick={onToggle}>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#0D9488] transition-colors cursor-pointer">{title}</span>
        <span className="text-xs text-[#94A3B8]">{desc}</span>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-all duration-300 ${active ? 'bg-[#0D9488]' : 'bg-[#E2E8F0]'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </div>
  );
}