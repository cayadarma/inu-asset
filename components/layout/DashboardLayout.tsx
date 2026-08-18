"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    // Tambahkan class dark:bg-[#0F172A] di sini
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Isi Halaman */}
        <main className="p-4 md:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}