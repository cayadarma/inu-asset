"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { DictionaryKey } from "@/lib/i18n/dictionary";
import { useDynamicTextMap } from "@/lib/i18n/useDynamicText";
import { getWitaDateStr } from "@/lib/assetSnapshot";

// Sumber SATU-SATUNYA: agenda Pemeliharaan Pencegahan (maintenance_schedules) yang
// scheduled_date-nya jatuh di BULAN INI (WITA) -- lampau maupun akan datang dalam bulan
// yang sama -- diurutkan berdasarkan JARAK ke hari ini (yang paling dekat duluan).
// TIDAK fallback ke bulan lain kalau bulan ini kosong: tampilkan kosong saja.
// Laporan kerusakan (damage_reports) SENGAJA tidak lagi ikut di sini.
interface Activity {
  id: string;
  scheduledDate: string; // YYYY-MM-DD
  href: string;
  assetName: string;
  kind: "pemeliharaanSelesai" | "agendaDijadwalkan";
}

function formatTanggal(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function RecentActivity() {
  const { t } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true);

      const todayStr = getWitaDateStr();
      const [year, month] = todayStr.split("-"); // bulan berjalan, WITA
      const monthStart = `${year}-${month}-01`;
      const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
      const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

      const { data: schedules } = await supabase
        .from("maintenance_schedules")
        .select(`id, status, scheduled_date, assets ( name )`)
        .gte("scheduled_date", monthStart)
        .lte("scheduled_date", monthEnd);

      const todayMs = new Date(todayStr + "T00:00:00Z").getTime();

      const sorted: Activity[] = (schedules || [])
        .map((s: any) => ({
          id: `sch-${s.id}`,
          assetName: s.assets?.name || "",
          kind: (s.status === "Selesai" ? "pemeliharaanSelesai" : "agendaDijadwalkan") as Activity["kind"],
          scheduledDate: s.scheduled_date as string,
          href: `/pemeliharaan/checklist/${s.id}`,
        }))
        .sort((a, b) => {
          const distA = Math.abs(new Date(a.scheduledDate + "T00:00:00Z").getTime() - todayMs);
          const distB = Math.abs(new Date(b.scheduledDate + "T00:00:00Z").getTime() - todayMs);
          return distA - distB;
        })
        .slice(0, 5);

      setActivities(sorted);
      setIsLoading(false);
    }
    fetchActivities();
  }, []);

  // Nama aset adalah teks bebas dari DB -> translate lewat DeepL+cache
  const dynamicTexts = useDynamicTextMap(activities.map((a) => a.assetName));

  const buildTitle = (act: Activity): string => {
    const assetDisplay = dynamicTexts.get((act.assetName || "").trim()) || act.assetName || t("recentActivity.defaultAssetName");
    if (act.kind === "pemeliharaanSelesai") return t("recentActivity.pemeliharaanSelesai", { asset: assetDisplay });
    return t("recentActivity.agendaDijadwalkan", { asset: assetDisplay });
  };

  return (
    <div className="flex-1 p-6 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base">{t("recentActivity.title")}</h3>
          <p className="text-[#94A3B8] text-xs mt-1">{t("recentActivity.subtitle")}</p>
        </div>
        <Link href="/pemeliharaan" className="text-[13px] font-bold text-[#0D9488] dark:text-[#37BAAE] hover:underline whitespace-nowrap">
          {t("recentActivity.viewAll")}
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-[#94A3B8] italic">{t("recentActivity.loading")}</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[#94A3B8] italic">{t("recentActivity.empty")}</p>
        ) : (
          activities.map((act) => (
            <Link
              key={act.id}
              href={act.href}
              className="pb-4 border-b border-gray-50 dark:border-[#334155] last:border-0 last:pb-0 flex flex-col gap-1 hover:opacity-70 transition-opacity"
            >
              <span className="text-[14px] font-bold text-[#334155] dark:text-[#F8FAFC]">{buildTitle(act)}</span>
              <span className="text-[12px] text-[#94A3B8] font-medium italic">{formatTanggal(act.scheduledDate)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}