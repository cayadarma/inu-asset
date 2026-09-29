"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import MaintenanceTabs from "@/components/maintenance/MaintenanceTabs";
import { supabase } from "@/lib/supabase";
import { addDaysStr } from "@/lib/assetSnapshot";

interface AgendaItem {
  id: string;
  scheduled_date: string;
  status: string;
  operator_name: string | null;
  asset_id: string;
  assets: {
    name: string;
    type: string;
    locations: { name: string } | null;
  } | null;
}

// --- PENGULANGAN AGENDA (SEPERTI MEMBUAT ACARA DI KALENDER) ---
// Mode: tidak diulang (sekali), setiap hari, setiap minggu (pilih hari, boleh lebih dari 1), setiap bulan.
// Agenda pertama SELALU dibuat di tanggal yang dipilih. "Jumlah pengulangan" = jumlah agenda
// TAMBAHAN setelah agenda pertama.
//  - Harian  : hari berikutnya, satu per hari.
//  - Mingguan: mulai hari SETELAH tanggal pertama, hari yang cocok dengan hari terpilih dijadikan agenda.
//              Contoh: Senin 5 Okt, "setiap Senin", 3 kali -> 12, 19, 26 Okt.
//  - Bulanan : tanggal yang sama tiap bulan. Bulan yang tidak punya tanggal itu (mis. tgl 31 di
//              bulan 30 hari) memakai hari TERAKHIR bulan tersebut, bukan dilewati.
type RepeatMode = "none" | "daily" | "weekly" | "monthly";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Sen" }, { value: 2, label: "Sel" }, { value: 3, label: "Rab" },
  { value: 4, label: "Kam" }, { value: 5, label: "Jum" }, { value: 6, label: "Sab" },
  { value: 0, label: "Min" },
];
const MAX_REPEAT: Record<Exclude<RepeatMode, "none">, number> = { daily: 365, weekly: 104, monthly: 60 };
const REPEAT_UNIT_LABEL: Record<Exclude<RepeatMode, "none">, string> = { daily: "hari", weekly: "minggu", monthly: "bulan" };

function generateRepeatDates(baseDate: string, mode: RepeatMode, weekdays: number[], count: number): string[] {
  const result: string[] = [];
  if (mode === "none" || count <= 0) return result;

  if (mode === "daily") {
    for (let i = 1; i <= count; i++) result.push(addDaysStr(baseDate, i));
    return result;
  }

  if (mode === "weekly") {
    if (weekdays.length === 0) return result;
    let current = baseDate;
    // Batas pengaman 10 tahun ke depan supaya loop tidak pernah tak terbatas
    for (let i = 0; i < 3660 && result.length < count; i++) {
      current = addDaysStr(current, 1);
      if (weekdays.includes(new Date(current + "T00:00:00Z").getUTCDay())) result.push(current);
    }
    return result;
  }

  // monthly
  const [y, m, d] = baseDate.split("-").map(Number);
  for (let i = 1; i <= count; i++) {
    const monthIndex = m - 1 + i;
    const year = y + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    result.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return result;
}

const formatTanggalSingkat = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

// Sumber salinan checklist: agenda lama beserta jumlah item checklist-nya
interface SourceAgenda {
  id: string;
  scheduled_date: string;
  asset_id: string;
  assetName: string;
  itemCount: number;
}

function MaintenanceContent() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  // --- STATE MODAL TAMBAH AGENDA ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [assetsByLocation, setAssetsByLocation] = useState<any[]>([]);
  const [formLocationId, setFormLocationId] = useState("");
  const [formAssetId, setFormAssetId] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([""]);

  // --- STATE PENGULANGAN AGENDA ---
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatCount, setRepeatCount] = useState(1);

  // --- STATE SALIN CHECKLIST DARI AGENDA LAMA ---
  const [sourceAgendas, setSourceAgendas] = useState<SourceAgenda[]>([]);
  const [sourceScheduleId, setSourceScheduleId] = useState("");

  const startYear = 1901;
  const endYear = 2099;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const emptySlots = startDay === 0 ? 6 : startDay - 1;

  const today = new Date();

  // --- AMBIL DATA AGENDA DARI SUPABASE (SATU BULAN BERJALAN) ---
  const fetchAgenda = async () => {
    setIsLoading(true);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`id, scheduled_date, status, operator_name, asset_id, assets ( name, type, locations ( name ) )`)
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date", { ascending: true });

    if (!error && data) setAgenda(data as any);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate.getFullYear(), viewDate.getMonth()]);

  // --- AMBIL LOKASI (SEKALI SAAT MODAL DIBUKA) ---
  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*").order("name", { ascending: true });
    if (data) setLocations(data);
  };

  // --- AMBIL ASET SESUAI LOKASI TERPILIH ---
  useEffect(() => {
    async function fetchAssetsByLocation() {
      if (!formLocationId) {
        setAssetsByLocation([]);
        return;
      }
      const { data } = await supabase
        .from("assets")
        .select("id, name, type")
        .eq("location_id", formLocationId)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (data) setAssetsByLocation(data);
    }
    fetchAssetsByLocation();
  }, [formLocationId]);

  // --- AMBIL AGENDA LAMA (BESERTA JUMLAH ITEM CHECKLIST) UNTUK DIJADIKAN SUMBER SALINAN ---
  const fetchSourceAgendas = async () => {
    const { data } = await supabase
      .from("maintenance_schedules")
      .select("id, scheduled_date, asset_id, assets ( name ), maintenance_checklist_items ( count )")
      .order("scheduled_date", { ascending: false })
      .limit(150);

    const rows: SourceAgenda[] = (data || [])
      .map((r: any) => ({
        id: r.id,
        scheduled_date: r.scheduled_date,
        asset_id: r.asset_id,
        assetName: r.assets?.name || r.asset_id,
        itemCount: r.maintenance_checklist_items?.[0]?.count ?? 0,
      }))
      .filter((r: SourceAgenda) => r.itemCount > 0);
    setSourceAgendas(rows);
  };

  // --- SALIN ITEM CHECKLIST DARI AGENDA LAMA KE FORM (HASILNYA TETAP BISA DIEDIT) ---
  const handleCopyFromAgenda = async (scheduleId: string) => {
    if (!scheduleId) {
      setSourceScheduleId("");
      return;
    }
    if (checklistItems.some((item) => item.trim()) && !confirm("Item checklist yang sudah diketik akan diganti dengan item dari agenda yang dipilih. Lanjutkan?")) {
      return;
    }

    const { data, error } = await supabase
      .from("maintenance_checklist_items")
      .select("task, sort_order")
      .eq("schedule_id", scheduleId)
      .order("sort_order", { ascending: true });

    if (error) {
      alert("Gagal menyalin checklist: " + error.message);
      return;
    }
    if (data && data.length > 0) {
      setChecklistItems(data.map((d: any) => d.task as string));
      setSourceScheduleId(scheduleId);
    }
  };

  const openAddModal = () => {
    setFormLocationId("");
    setFormAssetId("");
    setChecklistItems([""]);
    setRepeatMode("none");
    setRepeatWeekdays([]);
    setRepeatCount(1);
    setSourceScheduleId("");
    fetchSourceAgendas();
    fetchLocations();
    setIsModalOpen(true);
  };

  const handleGoToToday = () => {
    setViewDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  // --- LOGIKA CHECKLIST BUILDER (ALA GOOGLE FORM) ---
  const addChecklistRow = () => setChecklistItems(prev => [...prev, ""]);
  const removeChecklistRow = (index: number) => setChecklistItems(prev => prev.filter((_, i) => i !== index));
  const updateChecklistRow = (index: number, value: string) => {
    setChecklistItems(prev => prev.map((item, i) => (i === index ? value : item)));
  };

  // --- SIMPAN AGENDA BARU ---
  const handleSaveAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !formLocationId || !formAssetId) return;

    const validTasks = checklistItems.map(t => t.trim()).filter(Boolean);
    if (validTasks.length === 0) {
      alert("Tambahkan minimal 1 item checklist pemeliharaan.");
      return;
    }

    setIsSaving(true);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const scheduledDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;

    if (repeatMode === "weekly" && repeatWeekdays.length === 0) {
      alert("Pilih minimal 1 hari untuk pengulangan mingguan.");
      setIsSaving(false);
      return;
    }

    // --- AGENDA TAMBAHAN HASIL PENGULANGAN ---
    // Lewati tanggal yang untuk aset ini SUDAH punya agenda, supaya tidak dobel
    // kalau pengulangan dibuat berkali-kali.
    let extraDates = repeatDates;
    let skippedDates: string[] = [];
    if (extraDates.length > 0) {
      const { data: existing } = await supabase
        .from("maintenance_schedules")
        .select("scheduled_date")
        .eq("asset_id", formAssetId)
        .in("scheduled_date", extraDates);
      const existingSet = new Set((existing || []).map((e: any) => e.scheduled_date as string));
      skippedDates = extraDates.filter((d) => existingSet.has(d));
      extraDates = extraDates.filter((d) => !existingSet.has(d));
    }

    const allDates = [scheduledDate, ...extraDates];

    const { data: newSchedules, error } = await supabase
      .from("maintenance_schedules")
      .insert(
        allDates.map((d) => ({
          asset_id: formAssetId,
          location_id: formLocationId,
          scheduled_date: d,
          status: "Terjadwal",
        }))
      )
      .select();

    if (error || !newSchedules || newSchedules.length === 0) {
      alert("Gagal menyimpan agenda: " + (error?.message || "unknown error"));
      setIsSaving(false);
      return;
    }

    // Setiap agenda (termasuk hasil pengulangan) mendapat salinan checklist yang sama
    const checklistPayload = newSchedules.flatMap((schedule: any) =>
      validTasks.map((task, index) => ({
        schedule_id: schedule.id,
        task,
        status: "Belum",
        sort_order: index,
      }))
    );

    const { error: checklistError } = await supabase.from("maintenance_checklist_items").insert(checklistPayload);

    if (checklistError) {
      alert("Agenda tersimpan, tapi gagal menyimpan checklist: " + checklistError.message);
    }

    if (extraDates.length > 0 || skippedDates.length > 0) {
      alert(
        `${newSchedules.length} agenda dibuat.` +
          (skippedDates.length > 0 ? `\n${skippedDates.length} tanggal dilewati karena aset ini sudah punya agenda di tanggal tersebut.` : "")
      );
    }

    // Tandai aset sedang dalam proses pemeliharaan terjadwal.
    // Agenda hasil pengulangan TIDAK ikut mengubah status aset saat dibuat (hanya agenda pertama,
    // seperti perilaku sebelumnya), supaya aset tidak tertahan "Pemeliharaan" sampai agenda terjauh.
    await supabase.from("assets").update({ status: "Pemeliharaan" }).eq("id", formAssetId);

    setIsSaving(false);
    setIsModalOpen(false);
    fetchAgenda();
  };

  // --- HITUNG STATUS TAMPILAN (Terlambat jika lewat tanggal & belum selesai) ---
  const getDisplayStatus = (item: AgendaItem) => {
    if (item.status === "Selesai" || item.status === "Berlangsung") return item.status;
    const scheduled = new Date(item.scheduled_date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (scheduled < now) return "Terlambat";
    return item.status;
  };

  // Tanggal terpilih di kalender (YYYY-MM-DD) -- dibawa ke tab Checklist Harian
  const selectedDateStr = selectedDay
    ? `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : undefined;

  // Daftar tanggal agenda tambahan hasil pengulangan (untuk pratinjau & penyimpanan)
  const repeatDates = useMemo(
    () => (selectedDateStr ? generateRepeatDates(selectedDateStr, repeatMode, repeatWeekdays, repeatCount) : []),
    [repeatMode, repeatWeekdays, repeatCount, selectedDateStr]
  );

  const toggleRepeatWeekday = (day: number) =>
    setRepeatWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const handleRepeatModeChange = (mode: RepeatMode) => {
    setRepeatMode(mode);
    if (mode !== "none") setRepeatCount((prev) => Math.min(prev, MAX_REPEAT[mode]));
    // Saat pertama kali memilih "mingguan", otomatis centang hari dari tanggal terpilih
    if (mode === "weekly" && repeatWeekdays.length === 0 && selectedDateStr) {
      setRepeatWeekdays([new Date(selectedDateStr + "T00:00:00Z").getUTCDay()]);
    }
  };

  const displayAgenda = selectedDay
    ? agenda.filter(a => new Date(a.scheduled_date + "T00:00:00").getDate() === selectedDay)
    : agenda;

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pemeliharaan Pencegahan</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Monitoring jadwal pemeliharaan rutin seluruh aset</p>
        </div>
        <MaintenanceTabs active="pencegahan" date={selectedDateStr} />
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* KALENDER */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
               <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pilih Tanggal</h3>
               <div className="flex items-center gap-1">
                  {/* TOMBOL HARI INI (BARU) */}
                  <button
                    onClick={handleGoToToday}
                    title="Kembali ke hari ini"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#CCFBF1] dark:bg-[#115E59]/30 text-[#0D9488] dark:text-[#37BAAE] rounded-lg text-[11px] font-bold hover:bg-[#0D9488] hover:text-white transition-all mr-1"
                  >
                    <CalendarDays size={14} /> Hari Ini
                  </button>
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] rounded transition-all"><ChevronLeft size={18}/></button>
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] rounded transition-all"><ChevronRight size={18}/></button>
               </div>
            </div>

            {/* DROPDOWN BULAN & TAHUN (RENTANG LUAS) */}
            <div className="grid grid-cols-2 gap-2">
               <select
                value={viewDate.getMonth()}
                onChange={(e) => setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value)))}
                className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] rounded-xl text-xs font-bold outline-none text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer"
               >
                 {monthNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
               </select>
               <select
                value={viewDate.getFullYear()}
                onChange={(e) => setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth()))}
                className="p-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] rounded-xl text-xs font-bold outline-none text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#94A3B8] uppercase">
            <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: emptySlots }).map((_, i) => <div key={`e-${i}`} className="h-10"></div>)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = selectedDay === day;
                const isToday = day === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
                const hasAgenda = agenda.some(a => new Date(a.scheduled_date + "T00:00:00").getDate() === day);

                return (
                <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative h-10 flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all cursor-pointer
                    ${isSelected
                        ? 'bg-[#0D9488] text-white shadow-lg scale-105'
                        : isToday
                          ? 'bg-[#CCFBF1] text-[#0D9488] border border-[#0D9488]'
                          : 'bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-teal-50 dark:hover:bg-[#115E59]'
                    }`}
                >
                    {day}
                    {hasAgenda && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0D9488]"></span>
                    )}
                </div>
                );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} className="flex items-center justify-center text-[11px] font-bold text-primary dark:text-[#37BAAE] hover:underline text-left">Tampilkan Semua Agenda</button>
            )}
            {/* TOMBOL TAMBAH AGENDA (SELALU TAMPIL; PAKAI HARI INI JIKA BELUM ADA TANGGAL DIPILIH) */}
            <button
              onClick={() => {
                if (!selectedDay) setSelectedDay(today.getDate());
                openAddModal();
              }}
              className="flex items-center justify-center gap-2 bg-[#0D9488] text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-teal-700 shadow-md transition-all active:scale-95"
            >
              <Plus size={18} /> Tambah Agenda{selectedDay ? ` — ${selectedDay} ${monthNames[viewDate.getMonth()]}` : ""}
            </button>
          </div>
        </div>

        {/* TABEL AGENDA */}
        <div className="xl:col-span-2 bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg">
              {selectedDay ? `Agenda ${selectedDay} ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}` : "Agenda Bulan Ini"}
            </h3>
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase">Total: {displayAgenda.length}</span>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-[#94A3B8] italic">Memuat agenda...</div>
            ) : displayAgenda.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b text-[#475569] dark:text-[#94A3B8] font-bold uppercase text-[11px]">
                  <tr><th className="px-4 py-4">Aset / Lokasi</th><th className="px-4 py-4">Operator</th><th className="px-4 py-4 text-center">Status</th><th className="px-4 py-4 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#334155]">
                  {displayAgenda.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#0F172A]/50">
                      <td className="px-4 py-5">
                        <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.assets?.name || "Aset tidak ditemukan"}</p>
                        <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 uppercase font-bold">{item.assets?.locations?.name || "-"}</p>
                      </td>
                      <td className="px-4 py-5 text-[#475569] dark:text-[#94A3B8] font-medium">{item.operator_name || <span className="italic text-[#94A3B8]">Belum ditentukan</span>}</td>
                      <td className="px-4 py-5 text-center"><Badge status={getDisplayStatus(item)} /></td>
                      <td className="px-4 py-5 text-center">
                        <Link href={`/pemeliharaan/checklist/${item.id}`} className="px-4 py-1.5 bg-[#CCFBF1] dark:bg-[#115E59]/30 text-[#0D9488] dark:text-[#CCFBF1] rounded-lg font-bold text-xs hover:bg-[#0D9488] hover:text-white transition-all">Detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-20 text-[#94A3B8] italic">
                {selectedDay ? "Tidak ada agenda di tanggal ini. Klik \"Tambah Agenda\" untuk membuat jadwal baru." : "Belum ada agenda bulan ini."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH AGENDA */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Tambah Agenda Pemeliharaan — ${selectedDay ?? ""} ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`}>
        <form onSubmit={handleSaveAgenda} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pilih Lokasi</label>
              <select
                required
                value={formLocationId}
                onChange={(e) => { setFormLocationId(e.target.value); setFormAssetId(""); }}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white cursor-pointer"
              >
                <option value="">-- Pilih Lokasi --</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pilih Aset</label>
              <select
                required
                disabled={!formLocationId}
                value={formAssetId}
                onChange={(e) => setFormAssetId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{formLocationId ? "-- Pilih Aset --" : "Pilih lokasi dahulu"}</option>
                {assetsByLocation.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
              </select>
            </div>
          </div>

          {/* SALIN CHECKLIST DARI AGENDA LAMA */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Salin Checklist dari Agenda Lama (opsional)</label>
            <select
              value={sourceScheduleId}
              onChange={(e) => handleCopyFromAgenda(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white cursor-pointer"
            >
              <option value="">-- Ketik manual / tidak menyalin --</option>
              {formAssetId && sourceAgendas.some((a) => a.asset_id === formAssetId) && (
                <optgroup label="Aset yang dipilih">
                  {sourceAgendas.filter((a) => a.asset_id === formAssetId).map((a) => (
                    <option key={a.id} value={a.id}>{a.assetName} — {formatTanggalSingkat(a.scheduled_date)} ({a.itemCount} item)</option>
                  ))}
                </optgroup>
              )}
              <optgroup label={formAssetId ? "Aset lain" : "Semua agenda"}>
                {sourceAgendas.filter((a) => !formAssetId || a.asset_id !== formAssetId).map((a) => (
                  <option key={a.id} value={a.id}>{a.assetName} — {formatTanggalSingkat(a.scheduled_date)} ({a.itemCount} item)</option>
                ))}
              </optgroup>
            </select>
            <span className="text-[11px] text-[#94A3B8] italic">Item checklist akan terisi otomatis di bawah, dan tetap bisa diedit atau ditambah. Menampilkan 150 agenda terbaru.</span>
          </div>

          {/* CHECKLIST BUILDER ALA GOOGLE FORM */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Checklist Kegiatan Pemeliharaan</label>
            <div className="flex flex-col gap-2">
              {checklistItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#94A3B8] w-5 text-center">{index + 1}.</span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Cek level oli mesin"
                    value={item}
                    onChange={(e) => updateChecklistRow(index, e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeChecklistRow(index)}
                    disabled={checklistItems.length === 1}
                    className="p-2.5 text-[#94A3B8] hover:text-red-500 disabled:opacity-30 disabled:hover:text-[#94A3B8] transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addChecklistRow}
              className="w-fit flex items-center gap-2 text-sm font-bold text-[#0D9488] hover:underline mt-1"
            >
              <Plus size={16} /> Tambah item checklist
            </button>
          </div>

          {/* PENGULANGAN (SEPERTI ACARA DI KALENDER) */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pengulangan</label>
            <select
              value={repeatMode}
              onChange={(e) => handleRepeatModeChange(e.target.value as RepeatMode)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white cursor-pointer"
            >
              <option value="none">Tidak diulang (sekali)</option>
              <option value="daily">Ulangi setiap hari</option>
              <option value="weekly">Ulangi setiap minggu (pilih hari)</option>
              <option value="monthly">Ulangi setiap bulan</option>
            </select>

            {repeatMode !== "none" && (
              <div className="flex flex-col gap-4 p-4 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] rounded-2xl">
                {repeatMode === "weekly" && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Ulangi pada hari</span>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((d) => {
                        const active = repeatWeekdays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => toggleRepeatWeekday(d.value)}
                            className={`w-12 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                              active
                                ? "bg-[#0D9488] border-[#0D9488] text-white"
                                : "bg-white dark:bg-[#1E293B] border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8]"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {repeatMode === "monthly" && (
                  <p className="text-xs text-[#94A3B8]">
                    Diulang di tanggal yang sama tiap bulan. Bulan yang tidak punya tanggal itu memakai hari terakhir bulan tersebut.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Jumlah pengulangan</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={MAX_REPEAT[repeatMode]}
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(Math.min(MAX_REPEAT[repeatMode], Math.max(1, Number(e.target.value) || 1)))}
                      className="w-24 px-4 py-2.5 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm font-bold outline-none focus:border-primary dark:text-white"
                    />
                    <span className="text-xs text-[#94A3B8]">
                      kali, di luar agenda pertama (maks. {MAX_REPEAT[repeatMode]}, tiap {REPEAT_UNIT_LABEL[repeatMode]})
                    </span>
                  </div>
                </div>

                {repeatDates.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                      Agenda tambahan yang akan dibuat ({repeatDates.length})
                    </span>
                    <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                      {repeatDates.length <= 8
                        ? repeatDates.map(formatTanggalSingkat).join(" • ")
                        : `${repeatDates.slice(0, 5).map(formatTanggalSingkat).join(" • ")} • … • ${formatTanggalSingkat(repeatDates[repeatDates.length - 1])}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-secondary dark:text-[#94A3B8] font-bold text-sm hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">Batalkan</button>
             <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-60">
                {isSaving ? "Menyimpan..." : "Simpan Agenda"}
             </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Wrapper dengan Suspense agar tidak error saat deploy
export default function MaintenancePage() {
  return (
    <Suspense fallback={<div>Memuat...</div>}>
      <MaintenanceContent />
    </Suspense>
  );
}