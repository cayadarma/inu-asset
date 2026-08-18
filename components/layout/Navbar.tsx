"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon, Bell, Menu } from "lucide-react";
import Link from "next/link"; // Import Link

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

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
    <header className="h-[72px] bg-white border-b border-gray-100 px-4 md:px-8 flex justify-between items-center sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 lg:hidden text-secondary hover:bg-gray-100 rounded-lg">
          <Menu size={24} />
        </button>

        {/* BREADCRUMBS CLICKABLE */}
        <div className="flex items-center gap-2 text-[14px]">
          <Link href="/" className="text-[#64748B] font-medium hover:text-primary transition-colors hidden md:inline">
            INU Asset
          </Link>
          <span className="text-[#94A3B8] hidden md:inline">/</span>
          
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {isLast ? (
                  // Halaman terakhir tidak perlu link (karena kita sudah di sana)
                  <span className="text-[#0F172A] font-bold">{crumb.label}</span>
                ) : (
                  // Selain halaman terakhir, berikan Link
                  <Link 
                    href={crumb.href} 
                    className="text-[#64748B] font-medium hover:text-primary transition-colors"
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

      {/* Bagian Kanan Tetap Sama... */}
      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 md:gap-3 bg-[#F1F5F9] p-1 rounded-full border border-gray-100 cursor-pointer">
          <div className="p-1.5 text-[#64748B]"><Sun size={14} /></div>
          <div className="w-10 h-5 bg-white rounded-full shadow-sm flex items-center px-1">
             <div className="w-3.5 h-3.5 bg-[#E2E8F0] rounded-full"></div>
          </div>
          <div className="p-1.5 text-[#64748B]"><Moon size={14} /></div>
        </div>

        <button className="relative w-10 h-10 bg-[#F1F5F9] rounded-full flex items-center justify-center transition-all hover:bg-gray-200">
          <Bell size={20} className="text-[#0F172A]" />
          <div className="absolute top-2.5 right-3 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white"></div>
        </button>
      </div>
    </header>
  );
}