"use client";

import Image from "next/image"; 
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
      {/* Overlay Mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] lg:hidden transition-opacity" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Container - Ditambahkan dark:bg-[#1E293B] dan dark:border-[#334155] */}
      <aside className={`
        fixed left-0 top-0 h-screen bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] border-r border-gray-200 dark:border-[#334155] dark:border-[#334155] p-6 flex flex-col justify-between z-[70] transition-all duration-300
        w-[260px]
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 px-2">
              <div className="flex items-center justify-center">
                <Image src="/CROP_Logo_INU_UPDATE_2024.png" alt="Logo" width={40} height={40} className="object-contain" />
              </div>
              {/* Teks INU Asset Putih saat Dark Mode */}
              <span className="text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] text-xl font-bold tracking-tight">INU Asset</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-[#64748B] dark:text-[#94A3B8]"><X size={20} /></button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsOpen(false)} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-[#CCFBF1] dark:bg-[#115E59] text-[#0D9488] dark:text-[#CCFBF1] font-semibold shadow-sm"
                      : "text-[#475569] dark:text-[#94A3B8] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155] hover:text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:hover:text-[#F8FAFC] font-medium"
                  }`}
                >
                  <span className={`${isActive ? "text-[#0D9488] dark:text-[#CCFBF1]" : "text-[#64748B] dark:text-[#94A3B8]"}`}>
                    {item.icon}
                  </span>
                  <span className="text-[14px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-[#334155] dark:border-[#334155] flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-gray-50 dark:border-[#334155] shadow-sm flex-shrink-0">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[14px] font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] leading-tight truncate">Administrator</span>
            <span className="text-[11px] text-[#94A3B8] truncate italic">admin@inuasset.co.id</span>
          </div>
        </div>
      </aside>
    </>
  );
}