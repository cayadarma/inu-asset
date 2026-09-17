"use client";

import React from "react";
import Link from "next/link";
import { Role } from "@/lib/auth";

export type SettingsTabKey = "profil" | "manajemen-user";

interface SettingsTabsProps {
  active: SettingsTabKey;
  role: Role | undefined;
}

// Tab pill bersama, dipasang di:
// - /pengaturan (Profil Saya)
// - /pengaturan/manajemen-user (Manajemen User)
// Tab "Manajemen User" hanya dirender untuk role administrator & super_admin.
export default function SettingsTabs({ active, role }: SettingsTabsProps) {
  const canManageUsers = role === "administrator" || role === "super_admin";

  const TABS: { key: SettingsTabKey; label: string; href: string }[] = [
    { key: "profil", label: "Profil Saya", href: "/pengaturan" },
    ...(canManageUsers
      ? [{ key: "manajemen-user" as SettingsTabKey, label: "Manajemen User", href: "/pengaturan/manajemen-user" }]
      : []),
  ];

  if (TABS.length < 2) return null;

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