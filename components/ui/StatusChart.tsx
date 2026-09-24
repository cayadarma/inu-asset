"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { translateEnum } from "@/lib/i18n/enumTranslate";

interface StatusCount {
  label: string; // nilai enum asli (Bahasa Indonesia), di-translate saat render
  count: number;
  color: string;
}

export default function StatusChart() {
  const { t, lang } = useLanguage();
  const [statuses, setStatuses] = useState<StatusCount[]>([
    { label: "Beroperasi", count: 0, color: "bg-[#10B981]" },
    { label: "Idle", count: 0, color: "bg-[#8B5CF6]" },
    { label: "Pemeliharaan", count: 0, color: "bg-[#F59E0B]" },
    { label: "Perbaikan", count: 0, color: "bg-[#F97316]" },
    { label: "Rusak", count: 0, color: "bg-[#EF4444]" },
  ]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStatusCounts() {
      setIsLoading(true);
      const { data } = await supabase.from("assets").select("status, is_active");

      if (data) {
        // Aset yang sudah dinonaktifkan (is_active === false) dikeluarkan dari perhitungan --
        // statusnya (mis. "Rusak") sengaja tidak diubah saat dinonaktifkan supaya riwayatnya
        // tetap akurat, jadi kalau tidak difilter di sini dia akan terus "hantu" muncul di
        // diagram donat walau asetnya sudah tidak aktif. Konsisten dengan filter yang sama
        // di app/page.tsx, app/buku-sakit/page.tsx, dst.
        const activeAssets = data.filter((a) => a.is_active !== false);

        const beroperasi = activeAssets.filter((a) => a.status === "Beroperasi").length;
        const idle = activeAssets.filter((a) => a.status === "Idle").length;
        const pemeliharaan = activeAssets.filter((a) => a.status === "Pemeliharaan").length;
        const perbaikan = activeAssets.filter((a) => a.status === "Perbaikan").length;
        const rusak = activeAssets.filter((a) => a.status === "Rusak").length;

        setStatuses([
          { label: "Beroperasi", count: beroperasi, color: "bg-[#10B981]" },
          { label: "Idle", count: idle, color: "bg-[#8B5CF6]" },
          { label: "Pemeliharaan", count: pemeliharaan, color: "bg-[#F59E0B]" },
          { label: "Perbaikan", count: perbaikan, color: "bg-[#F97316]" },
          { label: "Rusak", count: rusak, color: "bg-[#EF4444]" },
        ]);
        setTotal(activeAssets.length);
      }
      setIsLoading(false);
    }
    fetchStatusCounts();
  }, []);

  // --- HITUNG SEGMEN CONIC-GRADIENT SECARA DINAMIS DARI PERSENTASE ASLI ---
  const gradientStops: string[] = [];
  const gradientColors = ["#10B981", "#8B5CF6", "#F59E0B", "#F97316", "#EF4444"];
  let cumulative = 0;
  statuses.forEach((s, i) => {
    const pct = total > 0 ? (s.count / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    gradientStops.push(`${gradientColors[i]} ${start}% ${cumulative}%`);
  });
  const conicGradient = total > 0
    ? `conic-gradient(${gradientStops.join(", ")})`
    : `conic-gradient(#E2E8F0 0% 100%)`; // abu-abu jika belum ada data

  return (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col min-h-[350px] transition-all duration-300">
      <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1 text-base">{t("statusChart.title")}</h3>
      <p className="text-[#94A3B8] text-xs mb-7">{t("statusChart.subtitle")}</p>
      <div className="flex flex-1 flex-col sm:flex-row items-center justify-center gap-8">
        <div
          className="relative w-32 h-32 flex-shrink-0 rounded-full flex items-center justify-center shadow-inner"
          style={{ background: conicGradient }}
        >
          <div className="absolute inset-4 bg-white dark:bg-[#1E293B] rounded-full flex flex-col items-center justify-center transition-all duration-300">
            <span className="text-xl font-black text-[#0F172A] dark:text-[#F8FAFC]">
              {isLoading ? "..." : total.toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase">{t("statusChart.total")}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-[200px]">
          {statuses.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-sm text-[#64748B] dark:text-[#94A3B8] font-medium">{translateEnum(item.label, lang)}</span>
              </div>
              <span className="text-sm font-black text-[#0F172A] dark:text-[#F8FAFC]">
                {isLoading ? "..." : item.count.toLocaleString("id-ID")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}