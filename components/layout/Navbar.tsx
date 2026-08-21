"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sun, Moon, Bell, Menu } from "lucide-react";
import Link from "next/link";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "@/lib/supabase";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isDarkMode, toggleTheme } = useTheme();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('realtime-notif').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'damage_reports' }, () => setNotifCount((prev) => prev + 1)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const generateBreadcrumbs = () => {
    if (pathname === "/") return [{ label: "Dashboard", href: "/" }];
    const paths = pathname.split("/").filter((path) => path !== "");
    let currentHref = "";
    const nameFromUrl = searchParams.get("name");

    return paths.map((path, index) => {
      currentHref += `/${path}`;
      let label = path.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      let finalHref = currentHref;

      if (paths[0] === "buku-sakit") {
        // Level 1: LAGOON
        if (index === 1 && nameFromUrl) {
          label = nameFromUrl.toUpperCase();
          finalHref = `${currentHref}?name=${nameFromUrl}`;
        }
        // Level 2: ID Aset (Contoh: AST-001)
        if (index === 2) {
          label = path.toUpperCase();
          finalHref = `${currentHref}?name=${nameFromUrl}`;
        }
        // Level 3: Detail Laporan
        if (index === 3) {
          label = "DETAIL LAPORAN";
        }
      }

      return { label, href: finalHref };
    });
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="h-[72px] bg-white dark:bg-[#1E293B] border-b border-gray-100 dark:border-[#334155] px-4 md:px-8 flex justify-between items-center sticky top-0 z-40 transition-colors duration-300 font-poppins">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 lg:hidden text-secondary dark:text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-[#334155] rounded-lg"><Menu size={24} /></button>
        <div className="flex items-center gap-2 text-[14px]">
          <Link href="/" className="text-[#64748B] dark:text-[#94A3B8] font-medium hover:text-primary transition-colors hidden md:inline">INU Asset</Link>
          <span className="text-[#94A3B8] hidden md:inline">/</span>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index === breadcrumbs.length - 1 ? (
                <span className="text-[#0F172A] dark:text-[#F8FAFC] font-bold">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="text-[#64748B] dark:text-[#94A3B8] font-medium hover:text-primary transition-colors">{crumb.label}</Link>
              )}
              {index < breadcrumbs.length - 1 && <span className="text-[#94A3B8]">/</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-6">
        <div onClick={toggleTheme} className="flex items-center gap-2 md:gap-3 bg-[#F1F5F9] dark:bg-[#334155] p-1 rounded-full border border-gray-100 dark:border-[#475569] cursor-pointer">
          <div className={`p-1.5 ${!isDarkMode ? 'text-orange-500' : 'text-gray-500'}`}><Sun size={14} /></div>
          <div className="w-10 h-5 bg-white dark:bg-[#0F172A] rounded-full shadow-sm flex items-center px-1">
             <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${isDarkMode ? 'translate-x-4 bg-[#37BAAE]' : 'translate-x-0 bg-[#E2E8F0]'}`}></div>
          </div>
          <div className={`p-1.5 ${isDarkMode ? 'text-yellow-300' : 'text-gray-500'}`}><Moon size={14} /></div>
        </div>
        <Link href="/notifikasi" onClick={() => setNotifCount(0)} className="relative w-10 h-10 bg-[#F1F5F9] dark:bg-[#334155] rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#475569]">
          <Bell size={20} className="text-[#0F172A] dark:text-[#F8FAFC]" />
          {notifCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#EF4444] rounded-full border-2 border-white dark:border-[#1E293B] text-[10px] text-white flex items-center justify-center font-bold animate-bounce">{notifCount}</div>}
        </Link>
      </div>
    </header>
  );
}