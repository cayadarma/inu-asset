import React from "react";

export default function StatCard({ title, value, description, icon }: any) {
  return (
    <div className="flex-1 min-w-[240px] p-5 bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] dark:border-[#334155] shadow-sm flex flex-col gap-2 transition-all duration-300">
      <div className="flex justify-between items-center text-[#94A3B8]">
        <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
        <div className="w-9 h-9 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488] dark:text-[#37BAAE]">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] mt-1">{value}</div>
      <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] font-medium">{description}</div>
    </div>
  );
}