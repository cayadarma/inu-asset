import React from "react";

type StatusType = "Beroperasi" | "Pemeliharaan" | "Rusak" | "Perbaikan" | "Aktif" | "Tidak Aktif" | "Tersedia" | "Menipis" | "Habis";

export default function Badge({ status }: { status: StatusType | string }) {
  const getStyle = (status: string) => {
    switch (status) {
      case "Beroperasi":
      case "Aktif":
      case "Tersedia":
        // Hijau Teal
        return "bg-[#D1FAE5] dark:bg-[#115E59]/30 text-[#065F46] dark:text-[#37BAAE]"; 
      case "Pemeliharaan":
      case "Menipis":
        // Kuning Amber
        return "bg-[#FFF7D6] dark:bg-[#F59E0B]/20 text-[#E28E00] dark:text-[#F59E0B]"; 
      case "Rusak":
      case "Habis":
        // Merah
        return "bg-[#FEE2E2] dark:bg-[#EF4444]/20 text-[#991B1B] dark:text-[#EF4444]"; 
      case "Perbaikan":
        // Oranye
        return "bg-[#FEF3C7] dark:bg-[#EF4444]/20 text-[#EF4444]"; 
      default:
        // Abu-abu (Default/Tidak Aktif)
        return "bg-[#F1F5F9] dark:bg-[#334155] text-[#475569] dark:text-[#94A3B8] dark:text-[#94A3B8]";
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors duration-300 ${getStyle(status)}`}>
      {status}
    </span>
  );
}