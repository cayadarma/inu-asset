"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Sun, Moon, Bell, Menu } from "lucide-react";
import Link from "next/link";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "@/lib/supabase";

function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nameFromUrl = searchParams.get("name");
  const assetName = searchParams.get("assetName");
  const issueTitle = searchParams.get("issueTitle");

  if (pathname === "/") {
    return <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Dashboard</span>;
  }

  const paths = pathname.split("/").filter((p) => p !== "");
  let currentHref = "";

  return (
    <div className="flex items-center gap-1 md:gap-2 text-[13px] md:text-[14px]">
      <Link href="/" className="text-[#64748B] dark:text-[#94A3B8] font-medium hover:text-primary hidden md:inline">
        INU Asset
      </Link>
      <span className="text-[#94A3B8] hidden md:inline">/</span>

      {paths.map((path, index) => {
        currentHref += `/${path}`;
        const isLast = index === paths.length - 1;
        const isHiddenOnMobile = !isLast && index < paths.length - 1;

        // Default label: ubah "registrasi-aset" -> "Registrasi Aset"
        let label = decodeURIComponent(path)
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        // --- OVERRIDE UUID MENJADI NAMA ASLI BERDASARKAN HIERARKI ---
        const rootModule = paths[0];

        // 1. Level Lokasi (index === 1) untuk registrasi-aset & buku-sakit
        if ((rootModule === "registrasi-aset" || rootModule === "buku-sakit") && index === 1 && nameFromUrl) {
          label = nameFromUrl.toUpperCase();
        }

        // 2. Level Aset (index === 2) untuk registrasi-aset & buku-sakit
        else if ((rootModule === "registrasi-aset" || rootModule === "buku-sakit") && index === 2 && assetName) {
          label = assetName.toUpperCase();
        }

        // 3. Level Laporan Kerusakan (index === 3) pada buku-sakit
        else if (rootModule === "buku-sakit" && index === 3 && issueTitle) {
          label = issueTitle.toUpperCase();
        }

        // 4. Kasus Khusus: Pemeliharaan Checklist (index === 2)
        else if (rootModule === "pemeliharaan" && paths[1] === "checklist" && index === 2 && nameFromUrl) {
          label = nameFromUrl.toUpperCase();
        }

        // Susun parameter URL agar query string tetap terbawa saat link breadcrumb diklik
        const params: string[] = [];
        if (nameFromUrl) params.push(`name=${encodeURIComponent(nameFromUrl)}`);
        if (assetName && index >= 2) params.push(`assetName=${encodeURIComponent(assetName)}`);
        if (issueTitle && index >= 3) params.push(`issueTitle=${encodeURIComponent(issueTitle)}`);

        const finalHref = params.length > 0 ? `${currentHref}?${params.join("&")}` : currentHref;

        return (
          <React.Fragment key={index}>
            <div className={`${isHiddenOnMobile ? "hidden md:flex" : "flex"} items-center gap-1 md:gap-2`}>
              {isLast ? (
                <span className="text-[#0F172A] dark:text-[#F8FAFC] font-bold truncate max-w-[150px] md:max-w-none">
                  {label}
                </span>
              ) : (
                <Link
                  href={finalHref}
                  className="text-[#64748B] dark:text-[#94A3B8] font-medium hover:text-primary whitespace-nowrap"
                >
                  {label}
                </Link>
              )}
              {!isLast && <span className="text-[#94A3B8]">/</span>}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const getInitialCount = async () => {
      const { count } = await supabase
        .from("damage_reports")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      setNotifCount(count || 0);
    };
    getInitialCount();

    const channel = supabase
      .channel("realtime-notif")
      .on("postgres_changes", { event: "*", schema: "public", table: "damage_reports" }, () =>
        getInitialCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header className="h-[72px] bg-white dark:bg-[#1E293B] border-b border-gray-100 dark:border-[#334155] px-4 md:px-8 flex justify-between items-center sticky top-0 z-40 transition-all font-poppins">
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 lg:hidden text-secondary dark:text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-[#334155] rounded-lg"
        >
          <Menu size={24} />
        </button>
        <Suspense fallback={<span className="text-xs text-gray-400 italic">Memuat...</span>}>
          <Breadcrumbs />
        </Suspense>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div
          onClick={toggleTheme}
          className="hidden lg:flex items-center gap-2 md:gap-3 bg-[#F1F5F9] dark:bg-[#334155] p-1 rounded-full border border-gray-100 dark:border-[#475569] cursor-pointer"
        >
          <div className={`p-1.5 ${!isDarkMode ? "text-orange-500" : "text-gray-500"}`}>
            <Sun size={14} />
          </div>
          <div className="w-10 h-5 bg-white dark:bg-[#0F172A] rounded-full shadow-sm flex items-center px-1">
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isDarkMode ? "translate-x-4 bg-[#37BAAE]" : "translate-x-0 bg-[#E2E8F0]"
              }`}
            ></div>
          </div>
          <div className={`p-1.5 ${isDarkMode ? "text-yellow-300" : "text-gray-500"}`}>
            <Moon size={14} />
          </div>
        </div>

        <Link
          href="/notifikasi"
          className="relative w-10 h-10 bg-[#F1F5F9] dark:bg-[#334155] rounded-full flex items-center justify-center transition-all hover:bg-gray-200 dark:hover:bg-[#475569]"
        >
          <Bell size={20} className="text-[#0F172A] dark:text-[#F8FAFC]" />
          {notifCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#EF4444] rounded-full border-2 border-white dark:border-[#1E293B] text-[10px] text-white flex items-center justify-center font-bold animate-bounce shadow-lg">
              {notifCount}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}