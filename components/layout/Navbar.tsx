"use client";

import React from "react";
import { Sun, Moon, Bell, Menu } from "lucide-react";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-[72px] bg-white border-b border-gray-100 px-4 md:px-8 flex justify-between items-center sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 lg:hidden text-secondary hover:bg-gray-100 rounded-lg">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-[#64748B] font-medium hidden md:inline">INU Asset</span>
          <span className="text-[#94A3B8] hidden md:inline">/</span>
          <span className="text-[#0F172A] font-bold">Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 md:gap-3 bg-[#F1F5F9] p-1 rounded-full border border-gray-100">
          <div className="p-1.5 text-[#64748B]"><Sun size={14} /></div>
          <div className="w-8 h-4 bg-white rounded-full shadow-sm flex items-center px-1">
             <div className="w-2.5 h-2.5 bg-[#E2E8F0] rounded-full"></div>
          </div>
          <div className="p-1.5 text-[#64748B]"><Moon size={14} /></div>
        </div>
        <button className="relative w-9 h-9 md:w-10 md:h-10 bg-[#F1F5F9] rounded-full flex items-center justify-center">
          <Bell size={18} />
          <div className="absolute top-2 right-2.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white"></div>
        </button>
      </div>
    </header>
  );
}