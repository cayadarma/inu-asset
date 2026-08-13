import React from "react";

type StatusType = "Beroperasi" | "Pemeliharaan" | "Rusak" | "Perbaikan" | "Aktif" | "Tidak Aktif";

export default function Badge({ status }: { status: StatusType | string }) {
  // Logika penentuan warna berdasarkan teks status
  const getStyle = (status: string) => {
    switch (status) {
      case "Beroperasi":
      case "Aktif":
        return "bg-[#D1FAE5] text-[#065F46]"; // Hijau
      case "Pemeliharaan":
        return "bg-[#FFF7D6] text-[#E28E00]"; // Kuning
      case "Rusak":
        return "bg-[#FEE2E2] text-[#991B1B]"; // Merah
      case "Perbaikan":
        return "bg-[#FEF3C7] text-[#EF4444]"; // Oranye
      default:
        return "bg-[#F1F5F9] text-[#475569]"; // Abu-abu
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap ${getStyle(status)}`}>
      {status}
    </span>
  );
}