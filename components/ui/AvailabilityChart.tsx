import React from "react";

export default function AvailabilityChart() {
  const data = [
    { month: "Jan", val: 92 }, { month: "Feb", val: 92 }, { month: "Mar", val: 94 },
    { month: "Apr", val: 94 }, { month: "Mei", val: 91 }, { month: "Jun", val: 91 },
    { month: "Jul", val: 95 }, { month: "Aug", val: 95 }, { month: "Sep", val: 93 },
    { month: "Oct", val: 93 }, { month: "Nov", val: 94 }, { month: "Dec", val: 94 },
  ];

  return (
    <div className="bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] dark:border-[#334155] shadow-sm flex flex-col min-h-[350px] transition-all duration-300">
      <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC] mb-8 text-base">Ketersediaan Aset Bulanan (%)</h3>
      <div className="flex-1 flex items-end justify-between gap-1 h-[200px] border-b border-gray-50 dark:border-[#334155] pb-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
            <div 
              style={{ height: `${item.val}%` }} 
              className="w-full bg-[#0D9488] dark:bg-[#37BAAE] rounded-t-sm transition-all hover:opacity-80 relative"
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold uppercase">
                {item.val}%
              </div>
            </div>
            <span className="text-[9px] md:text-[10px] text-[#94A3B8] font-bold">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}