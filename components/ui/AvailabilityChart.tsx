import React from "react";

export default function AvailabilityChart() {
  const data = [
    { month: "Jan", val: 92 }, { month: "Feb", val: 92 }, { month: "Mar", val: 94 },
    { month: "Apr", val: 94 }, { month: "Mei", val: 91 }, { month: "Jun", val: 91 },
    { month: "Jul", val: 95 }, { month: "Aug", val: 95 }, { month: "Sep", val: 93 },
    { month: "Oct", val: 93 }, { month: "Nov", val: 94 }, { month: "Dec", val: 94 },
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[350px]">
      <h3 className="font-bold text-[#0F172A] mb-8 text-base">Ketersediaan Aset Bulanan (%)</h3>
      
      {/* Area Grafik */}
      <div className="flex-1 flex items-end justify-between gap-1 h-[200px] border-b border-gray-50 pb-2">
        {data.map((item, index) => (
          /* Tambahkan h-full di bawah ini agar bar bisa menghitung % dari 200px */
          <div key={index} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group">
            <div 
              style={{ height: `${item.val}%` }} 
              className="w-full bg-[#0D9488] rounded-t-sm transition-all duration-500 hover:bg-teal-600 relative"
            >
              {/* Tooltip kecil saat di-hover */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.val}%
              </div>
            </div>
            <span className="text-[9px] md:text-[10px] text-[#94A3B8] font-medium rotate-45 md:rotate-0">
              {item.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}