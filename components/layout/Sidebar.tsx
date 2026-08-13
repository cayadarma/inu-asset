"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Box, 
  HeartPulse, 
  Wrench, 
  Package, 
  CircleDollarSign, 
  FileText, 
  Settings, 
  X 
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/" },
    { name: "Registrasi Aset", icon: <Box size={20} />, href: "/registrasi-aset" },
    { name: "Buku Sakit", icon: <HeartPulse size={20} />, href: "/buku-sakit" },
    { name: "Pemeliharaan", icon: <Wrench size={20} />, href: "/pemeliharaan" },
    { name: "Stok", icon: <Package size={20} />, href: "/stok" },
    { name: "Analisis Biaya", icon: <CircleDollarSign size={20} />, href: "/analisis-biaya" },
    { name: "Laporan", icon: <FileText size={20} />, href: "/laporan" },
    { name: "Pengaturan", icon: <Settings size={20} />, href: "/pengaturan" },
  ];

  return (
    <>
      {/* Overlay: Muncul di mobile saat sidebar terbuka agar background jadi gelap */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60] lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed left-0 top-0 h-screen bg-white border-r border-gray-200 p-6 flex flex-col justify-between z-[70] transition-all duration-300 ease-in-out
        w-[260px]
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex flex-col gap-8">
          {/* Header Sidebar: Logo & Tombol Close (Mobile) */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0D9488]/10 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-md"></div>
              </div>
              <span className="text-[#0F172A] text-xl font-bold tracking-tight">INU Asset</span>
            </div>
            
            {/* Tombol X untuk menutup di mobile */}
            <button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden p-1 hover:bg-gray-100 rounded-md text-[#64748B]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigasi Menu */}
          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              // LOGIKA BARU: Cek apakah halaman sekarang ada di dalam rute menu ini
              // Contoh: Jika URL '/pemeliharaan/korektif', maka menu '/pemeliharaan' akan tetap aktif
              const isActive = item.href === "/" 
                ? pathname === "/" 
                : pathname.startsWith(item.href);

              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsOpen(false)} // Tutup otomatis di mobile saat menu diklik
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-[#CCFBF1] text-[#0D9488] font-semibold shadow-sm"
                      : "text-[#475569] hover:bg-gray-50 hover:text-[#0F172A] font-medium"
                  }`}
                >
                  <span className={`${isActive ? "text-[#0D9488]" : "text-[#64748B] group-hover:text-[#0F172A]"}`}>
                    {item.icon}
                  </span>
                  <span className="text-[14px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profil User di Bagian Bawah */}
        <div className="pt-6 border-t border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-gray-50 shadow-sm flex-shrink-0">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[14px] font-bold text-[#0F172A] leading-tight truncate">Administrator</span>
            <span className="text-[11px] text-[#94A3B8] truncate italic">admin@inuasset.co.id</span>
          </div>
        </div>
      </aside>
    </>
  );
}