import React from "react";

export default function MaintenanceSummary() {
  const data = [
    { label: "Terjadwal", count: 15, color: "text-[#0D9488]" },
    { label: "Berlangsung", count: 8, color: "text-[#F59E0B]" },
    { label: "Selesai", count: 142, color: "text-[#10B981]" },
    { label: "Terlambat", count: 3, color: "text-[#EF4444]" },
  ];

  return (
    <div className="flex-1 p-6 bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] dark:border-[#334155] shadow-sm flex flex-col gap-6 transition-all duration-300">
      <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] text-base">Ikhtisar Pemeliharaan</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.map((item) => (
          <div key={item.label} className="p-4 bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A]/40 rounded-lg border border-gray-100 dark:border-[#334155] dark:border-[#334155] flex flex-col gap-1">
            <span className="text-[12px] text-[#475569] dark:text-[#94A3B8] dark:text-[#94A3B8] font-bold uppercase">{item.label}</span>
            <span className={`text-2xl font-black ${item.color}`}>{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}