"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar - Kita kirim status buka/tutup */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Konten Utama - Kita beri lg:ml-[260px] agar tidak tertabrak sidebar di desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        {/* Navbar */}
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Isi Halaman */}
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}