"use client";

import React from "react";
import { ChevronDown, Calendar } from "lucide-react";
import {
  PeriodMode,
  PeriodParams,
  MONTH_OPTIONS,
  PERIOD_MODES,
} from "@/lib/reportPeriod";

// --- Daftar tahun untuk dropdown (6 tahun ke belakang s/d tahun ini) ---
function useYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);
}

interface PeriodFilterProps {
  value: PeriodParams;
  onChange: (next: PeriodParams) => void;
}

export default function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const yearOptions = useYearOptions();

  const setMode = (mode: PeriodMode) => onChange({ ...value, mode });

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Jenis Periode */}
      <div className="relative flex-1 md:flex-none">
        <select
          value={value.mode}
          onChange={(e) => setMode(e.target.value as PeriodMode)}
          className="w-full appearance-none pl-10 pr-10 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer"
        >
          {PERIOD_MODES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
      </div>

      {/* TAHUNAN: pilih tahun */}
      {value.mode === "Tahunan" && (
        <div className="relative flex-1 md:flex-none">
          <select
            value={value.selectedYear}
            onChange={(e) => onChange({ ...value, selectedYear: Number(e.target.value) })}
            className="w-full appearance-none pl-4 pr-9 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        </div>
      )}

      {/* BULANAN: pilih bulan + tahun */}
      {value.mode === "Bulanan" && (
        <>
          <div className="relative flex-1 md:flex-none">
            <select
              value={value.selectedMonth}
              onChange={(e) => onChange({ ...value, selectedMonth: e.target.value })}
              className="w-full appearance-none pl-4 pr-9 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>
          <div className="relative flex-1 md:flex-none">
            <select
              value={value.selectedMonthYear}
              onChange={(e) => onChange({ ...value, selectedMonthYear: Number(e.target.value) })}
              className="w-full appearance-none pl-4 pr-9 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>
        </>
      )}

      {/* MINGGUAN: pilih tanggal acuan, minggu dimulai hari Minggu */}
      {value.mode === "Mingguan" && (
        <input
          type="date"
          value={value.selectedWeekDate}
          onChange={(e) => onChange({ ...value, selectedWeekDate: e.target.value })}
          className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
        />
      )}

      {/* HARIAN: pilih tanggal */}
      {value.mode === "Harian" && (
        <input
          type="date"
          value={value.selectedDay}
          onChange={(e) => onChange({ ...value, selectedDay: e.target.value })}
          className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
        />
      )}

      {/* CUSTOM: pilih tanggal "dari" dan "sampai" */}
      {value.mode === "Custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.customStart}
            max={value.customEnd}
            onChange={(e) => onChange({ ...value, customStart: e.target.value })}
            className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
          />
          <span className="text-[#94A3B8] text-xs font-bold">s/d</span>
          <input
            type="date"
            value={value.customEnd}
            min={value.customStart}
            onChange={(e) => onChange({ ...value, customEnd: e.target.value })}
            className="py-2.5 px-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-xs font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary"
          />
        </div>
      )}
    </div>
  );
}