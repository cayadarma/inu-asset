"use client";

import Image from "next/image"; 
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, Box, HeartPulse, Wrench, Package, 
  CircleDollarSign, FileText, Settings, X, Sun, Moon, LogOut
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: t("menu.dashboard"), icon: <LayoutDashboard size={20} />, href: "/" },
    { name: t("menu.registrasiAset"), icon: <Box size={20} />, href: "/registrasi-aset" },
    { name: t("menu.bukuSakit"), icon: <HeartPulse size={20} />, href: "/buku-sakit" },
    { name: t("menu.pemeliharaan"), icon: <Wrench size={20} />, href: "/pemeliharaan" },
    { name: t("menu.stok"), icon: <Package size={20} />, href: "/stok" },
    { name: t("menu.analisisBiaya"), icon: <CircleDollarSign size={20} />, href: "/analisis-biaya" },
    { name: t("menu.laporan"), icon: <FileText size={20} />, href: "/laporan" },
    { name: t("menu.pengaturan"), icon: <Settings size={20} />, href: "/pengaturan" },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-[60] lg:hidden" onClick={() => setIsOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-screen bg-white dark:bg-[#1E293B] border-r border-gray-200 dark:border-[#334155] p-6 flex flex-col justify-between z-[70] transition-all duration-300 w-[260px] ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Image src="/CROP_Logo_INU_UPDATE_2024.png" alt="Logo" width={32} height={32} className="object-contain" />
              <span className="text-[#0F172A] dark:text-[#F8FAFC] text-xl font-bold">INU Asset</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-[#64748B] dark:text-[#94A3B8]"><X size={20} /></button>
          </div>

          {/* SWITCH MODE KHUSUS MOBILE (Hanya tampil di HP) */}
          <div className="lg:hidden px-2">
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3 bg-[#F1F5F9] dark:bg-[#0F172A] rounded-xl border border-gray-100 dark:border-[#334155] transition-all"
            >
              <span className="text-sm font-bold text-[#475569] dark:text-[#94A3B8]">
                {isDarkMode ? t("menu.modeGelap") : t("menu.modeTerang")}
              </span>
              {isDarkMode ? <Moon size={18} className="text-yellow-300" /> : <Sun size={18} className="text-orange-500" />}
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? "bg-[#CCFBF1] dark:bg-[#115E59] text-[#0D9488] dark:text-[#CCFBF1] font-semibold" : "text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]"}`}>
                  {item.icon} <span className="text-[14px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-[#334155] flex items-center gap-3">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatar_seed || "Felix"}`} alt="Avatar" className="w-11 h-11 rounded-full border-2 border-gray-50 dark:border-[#334155] flex-shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[14px] font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">{user?.name || "-"}</span>
            <span className="text-[11px] text-[#94A3B8] italic truncate capitalize">{user?.role}</span>
          </div>
          <button
            onClick={logout}
            title={t("menu.logout")}
            className="p-2 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all flex-shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
