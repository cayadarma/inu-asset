"use client";

import React from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  autoDetected: boolean; // true kalau tercentang otomatis karena tanggal sudah lewat
}

// Kotak "Data lama (riwayat)" untuk form laporan kerusakan.
export default function HistoryCheckbox({ checked, onChange, autoDetected }: Props) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm ${
        checked
          ? "border-[#F59E0B] bg-[#FFFBEB] dark:bg-[#451A03] dark:border-[#B45309]"
          : "border-gray-200 dark:border-[#334155] bg-white dark:bg-[#0F172A]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-[#0D9488]"
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-bold text-[#0F172A] dark:text-white">Data lama (riwayat)</span>
        <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] leading-snug">
          {checked
            ? `${autoDetected ? "Tanggal sudah lewat. " : ""}Dianggap data riwayat: email tidak dikirim dan status aset tidak diubah.`
            : "Centang untuk memasukkan laporan lama tanpa mengirim email dan tanpa mengubah status aset."}
        </span>
      </span>
    </label>
  );
}