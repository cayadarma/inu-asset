"use client";

import React from "react";
import Link from "next/link";

export type MaintenanceTabKey = "pencegahan" | "korektif" | "checklist-harian";

const TABS: { key: MaintenanceTabKey; label: string; href: string }[] = [
  { key: "pencegahan", label: "Pemeliharaan Pencegahan", href: "/pemeliharaan" },
  { key: "korektif", label: "Pemeliharaan Korektif", href: "/pemeliharaan/korektif" },
  { key: "checklist-harian", label: "Checklist Harian", href: "/pemeliharaan/checklist-harian" },
];

interface MaintenanceTabsProps {
  active: MaintenanceTabKey;
}

// Tab pill bar bersama, dipasang di:
// - /pemeliharaan (Pemeliharaan Pencegahan)
// - /pemeliharaan/korektif (Pemeliharaan Korektif)
// - /pemeliharaan/checklist-harian (Checklist Harian)
// supaya user bisa berpindah antar 3 sub-modul Pemeliharaan dengan mudah.
export default function MaintenanceTabs({ active }: MaintenanceTabsProps) {
  return (
    <div className="flex bg-[#E2E8F0] dark:bg-[#334155] p-1 rounded-xl w-fit max-w-full overflow-x-auto">
      {TABS.map((tab) =>
        tab.key === active ? (
          <button
            key={tab.key}
            className="px-6 py-2 bg-white dark:bg-[#1E293B] rounded-lg text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] shadow-sm whitespace-nowrap"
          >
            {tab.label}
          </button>
        ) : (
          <Link
            key={tab.key}
            href={tab.href}
            className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] whitespace-nowrap transition-colors"
          >
            {tab.label}
          </Link>
        )
      )}
    </div>
  );
}