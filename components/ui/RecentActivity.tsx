"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { DictionaryKey } from "@/lib/i18n/dictionary";
import { useDynamicTextMap } from "@/lib/i18n/useDynamicText";

interface Activity {
  id: string;
  time: Date;
  href: string;
  assetName: string;
  issueTitle?: string;
  kind: "pemeliharaanSelesai" | "agendaDijadwalkan" | "laporanKerusakanBaru";
}

function timeAgo(date: Date, t: (key: DictionaryKey, vars?: Record<string, string | number>) => string) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return t("recentActivity.baruSaja");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("recentActivity.menitLalu", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("recentActivity.jamLalu", { n: hours });
  const days = Math.floor(hours / 24);
  return t("recentActivity.hariLalu", { n: days });
}

export default function RecentActivity() {
  const { t } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      setIsLoading(true);

      const { data: schedules } = await supabase
        .from("maintenance_schedules")
        .select(`id, status, created_at, completed_at, assets ( name )`)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: reports } = await supabase
        .from("damage_reports")
        .select(`id, issue_title, created_at, asset_id, assets ( name )`)
        .order("created_at", { ascending: false })
        .limit(5);

      const scheduleActivities: Activity[] = (schedules || []).map((s: any) => ({
        id: `sch-${s.id}`,
        assetName: s.assets?.name || "",
        kind: s.status === "Selesai" ? "pemeliharaanSelesai" : "agendaDijadwalkan",
        time: new Date(s.status === "Selesai" && s.completed_at ? s.completed_at : s.created_at),
        href: `/pemeliharaan/checklist/${s.id}`,
      }));

      const reportActivities: Activity[] = (reports || []).map((r: any) => ({
        id: `rep-${r.id}`,
        assetName: r.assets?.name || "",
        issueTitle: r.issue_title,
        kind: "laporanKerusakanBaru",
        time: new Date(r.created_at),
        href: `/pemeliharaan`,
      }));

      const merged = [...scheduleActivities, ...reportActivities]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 5);

      setActivities(merged);
      setIsLoading(false);
    }
    fetchActivities();
  }, []);

  // Nama aset & judul kerusakan adalah teks bebas dari DB -> translate lewat DeepL+cache
  const dynamicTexts = useDynamicTextMap([
    ...activities.map((a) => a.assetName),
    ...activities.map((a) => a.issueTitle).filter(Boolean) as string[],
  ]);

  const buildTitle = (act: Activity): string => {
    const assetDisplay = dynamicTexts.get((act.assetName || "").trim()) || act.assetName || t("recentActivity.defaultAssetName");
    if (act.kind === "pemeliharaanSelesai") return t("recentActivity.pemeliharaanSelesai", { asset: assetDisplay });
    if (act.kind === "agendaDijadwalkan") return t("recentActivity.agendaDijadwalkan", { asset: assetDisplay });
    const issueDisplay = act.issueTitle ? dynamicTexts.get(act.issueTitle.trim()) || act.issueTitle : "";
    return t("recentActivity.laporanKerusakanBaru", { asset: assetDisplay, issue: issueDisplay });
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
              <span className="text-[12px] text-[#94A3B8] font-medium italic">{timeAgo(act.time, t)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}