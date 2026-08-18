import React from "react";

export default function StatusChart() {
  const statuses = [
    { label: "Aktif", count: "1.089", color: "bg-[#10B981]" },
    { label: "Pemeliharaan", count: "87", color: "bg-[#F59E0B]" },
    { label: "Rusak", count: "42", color: "bg-[#EF4444]" },
    { label: "Tidak Aktif", count: "29", color: "bg-[#64748B]" },
  ];

  return (
    <div className="bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] dark:border-[#334155] shadow-sm flex flex-col min-h-[350px] transition-all duration-300">
      <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] mb-8 text-base">Status Operasional Aset</h3>
      <div className="flex flex-1 flex-col sm:flex-row items-center justify-center gap-8">
        <div 
          className="relative w-32 h-32 flex-shrink-0 rounded-full flex items-center justify-center shadow-inner"
          style={{ background: `conic-gradient(#10B981 0% 70%, #F59E0B 70% 85%, #EF4444 85% 95%, #64748B 95% 100%)` }}
        >
          <div className="absolute inset-4 bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] rounded-full flex flex-col items-center justify-center transition-all duration-300">
            <span className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC]">1.247</span>
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Total</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-[200px]">
          {statuses.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">{item.label}</span>
              </div>
              <span className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC]">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}