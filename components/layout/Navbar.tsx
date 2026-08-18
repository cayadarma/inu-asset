"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon, Bell, Menu, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTheme } from "../../context/ThemeContext"; // 1. Tambahkan Import ini

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { isDarkMode, toggleTheme } = useTheme(); // 2. Ambil fungsi tema

  const generateBreadcrumbs = () => {
    if (pathname === "/") return [{ label: "Dashboard", href: "/" }];
    const paths = pathname.split("/").filter((path) => path !== "");
    let currentHref = "";
    return paths.map((path) => {
      currentHref += `/${path}`;
      return {
        label: path.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        href: currentHref,
      };
    });
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    // 3. Tambahkan class "dark:bg-[#1E293B]" dan "dark:border-[#334155]"
    <header className="h-[72px] bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] border-b border-gray-100 dark:border-[#334155] dark:border-[#334155] px-4 md:px-8 flex justify-between items-center sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick} 
          className="p-2 lg:hidden text-secondary dark:text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-[#334155] rounded-lg"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2 text-[14px]">
          <Link href="/" className="text-[#64748B] dark:text-[#94A3B8] font-medium hover:text-primary transition-colors hidden md:inline">
            INU Asset
          </Link>
          <span className="text-[#94A3B8] hidden md:inline">/</span>
          
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {isLast ? (
                  // Warna teks saat Last Crumb (aktif) di Dark Mode
                  <span className="text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] font-bold">{crumb.label}</span>
                ) : (
                  <Link 
                    href={crumb.href} 
                    className="text-[#64748B] dark:text-[#94A3B8] font-medium hover:text-primary transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
                {!isLast && <span className="text-[#94A3B8]">/</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* 4. SWITCH MODE SEKARANG BISA DIKLIK */}
        <div 
          onClick={toggleTheme}
          className="flex items-center gap-2 md:gap-3 bg-[#F1F5F9] dark:bg-[#334155] p-1 rounded-full border border-gray-100 dark:border-[#334155] dark:border-[#475569] cursor-pointer"
        >
          <div className={`p-1.5 ${!isDarkMode ? 'text-orange-500' : 'text-gray-500'}`}><Sun size={14} /></div>
          <div className="w-10 h-5 bg-white dark:bg-[#1E293B] dark:bg-[#0F172A] rounded-full shadow-sm flex items-center px-1">
             {/* Lingkaran kecil yang bergeser */}
             <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${isDarkMode ? 'translate-x-4 bg-[#37BAAE]' : 'translate-x-0 bg-[#E2E8F0]'}`}></div>
          </div>
          <div className={`p-1.5 ${isDarkMode ? 'text-yellow-300' : 'text-gray-500'}`}><Moon size={14} /></div>
        </div>

        <button className="relative w-10 h-10 bg-[#F1F5F9] dark:bg-[#334155] rounded-full flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-[#475569]">
          <Bell size={20} className="text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC]" />
          <div className="absolute top-2.5 right-3 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white dark:border-[#1E293B]"></div>
        </button>
      </div>
    </header>
  );
}