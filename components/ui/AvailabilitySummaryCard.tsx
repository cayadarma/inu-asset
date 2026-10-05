"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, PlayCircle, Wrench, AlertTriangle, Hammer } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// Card gabungan: Asset Availability + Unit Beroperasi + Unit Pemeliharaan + Unit Rusak + Unit Perbaikan.
// Rumus availability TIDAK diubah (dihitung di app/page.tsx): Beroperasi + Idle + Pemeliharaan
// dianggap tersedia, Rusak & Perbaikan tidak; aset nonaktif dikeluarkan dari perhitungan.
// Tata letak 2x2 di bawah persentase:
//   [Unit Beroperasi]   [Unit Pemeliharaan]
//   [Unit Rusak]        [Unit Perbaikan]
// Tiap kotak unit bisa diklik -> /registrasi-aset/semua?status=<status> (daftar aset dengan
// status tersebut saja). Idle tidak punya kotak sendiri, jadi tidak ikut tersaring di sini.
interface AvailabilitySummaryCardProps {
  availabilityPct: number; // 0-100
  totalActive: number; // denominator availability (aset aktif)
  active: number; // Beroperasi
  maintenance: number; // Pemeliharaan
  rusak: number; // Rusak (menunggu diperbaiki)
  perbaikan: number; // Perbaikan (sedang ditangani)
}

export default function AvailabilitySummaryCard({
  availabilityPct,
  totalActive,
  active,
  maintenance,
  rusak,
  perbaikan,
}: AvailabilitySummaryCardProps) {
  const { t } = useLanguage();

  // Urutan sesuai tata letak 2x2: [Beroperasi][Pemeliharaan] / [Rusak][Perbaikan]
  const units = [
    {
      key: "beroperasi",
      status: "Beroperasi",
      title: t("dashboard.unitBeroperasi"),
      desc: t("dashboard.unitBeroperasiDesc"),
      value: active,
      icon: <PlayCircle size={20} />,
      iconClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500",
    },
    {
      key: "pemeliharaan",
      status: "Pemeliharaan",
      title: t("dashboard.unitPemeliharaan"),
      desc: t("dashboard.unitPemeliharaanDesc"),
      value: maintenance,
      icon: <Wrench size={20} />,
      iconClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-500",
    },
    {
      key: "rusak",
      status: "Rusak",
      title: t("dashboard.unitRusak"),
      desc: t("dashboard.unitRusakDesc"),
      value: rusak,
      icon: <AlertTriangle size={20} />,
      iconClass: "bg-red-50 dark:bg-red-500/10 text-red-500",
    },
    {
      key: "perbaikan",
      status: "Perbaikan",
      title: t("dashboard.unitPerbaikan"),
      desc: t("dashboard.unitPerbaikanDesc"),
      value: perbaikan,
      icon: <Hammer size={20} />,
      iconClass: "bg-orange-50 dark:bg-orange-500/10 text-orange-500",
    },
  ];

  return (
    <div className="h-full p-5 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-5 transition-shadow duration-300 hover:shadow-md">
      {/* 1. ASSET AVAILABILITY */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-[#94A3B8]">
          <span className="text-sm font-bold uppercase tracking-wider">{t("dashboard.assetAvailability")}</span>
          <div className="w-9 h-9 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488] dark:text-[#37BAAE]">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-1">{availabilityPct.toFixed(1)}%</div>
        <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] font-medium">{t("dashboard.assetAvailabilityDesc")}</div>
        <div className="text-[11px] font-bold text-[#94A3B8]">{t("dashboard.dariAsetAktif", { total: totalActive })}</div>
      </div>

      {/* 2x2: BEROPERASI, PEMELIHARAAN, RUSAK, PERBAIKAN */}
      <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-50 dark:border-[#334155]">
        {units.map((u) => (
          <Link
            key={u.key}
            href={`/registrasi-aset/semua?status=${encodeURIComponent(u.status)}`}
            className="flex items-start gap-3 p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#0D9488]/40 cursor-pointer"
          >
            <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center ${u.iconClass}`}>{u.icon}</div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">{u.title}</span>
              <span className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] leading-tight">{u.value}</span>
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">{u.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}