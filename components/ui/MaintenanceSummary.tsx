"use client";
import React from "react";

export default function MaintenanceSummary() {
  const data = [
    { label: "TERJADWAL", count: 15, color: "text-[#0D9488]", bg: "bg-[#D1FAE5]/30" },
    { label: "BERLANGSUNG", count: 8, color: "text-[#F59E0B]", bg: "bg-[#FEF3C7]/30" },
    { label: "SELESAI", count: 142, color: "text-[#10B981]", bg: "bg-green-50/30" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-[#1E293B] rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-3 md:gap-4 lg:gap-6">
      <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base md:text-lg lg:text-lg">Daftar Work Order</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
        {data.map((item) => (
          <div key={item.label} className={`p-3 md:p-4 lg:p-6 ${item.bg} rounded-2xl border border-gray-100 dark:border-[#334155] flex flex-col gap-1 transition-all hover:scale-[1.02]`}>
            <span className="text-[9px] md:text-[10px] text-[#475569] dark:text-[#94A3B8] font-black uppercase tracking-widest">{item.label}</span>
            <span className={`text-2xl md:text-3xl font-black ${item.color}`}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}