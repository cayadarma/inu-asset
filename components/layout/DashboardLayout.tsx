"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    // Tambahkan class dark:bg-[#0F172A] di sini
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] transition-colors duration-300 print:block print:bg-white print:min-h-0">
      {/* Sidebar — tidak ikut tercetak */}
      <div className="print:hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px] print:ml-0 print:block">
        {/* Navbar — tidak ikut tercetak */}
        <div className="print:hidden">
          <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        </div>

        {/* Isi Halaman */}
        <main className="p-4 md:p-8 flex-1 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}