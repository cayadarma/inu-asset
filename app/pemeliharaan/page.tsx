"use client";

import React, { useState, useEffect, Suspense } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

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
        .order("name", { ascending: true });
      if (data) setAssetsByLocation(data);
    }
    fetchAssetsByLocation();
  }, [formLocationId]);

  const openAddModal = () => {
    setFormLocationId("");
    setFormAssetId("");
    setChecklistItems([""]);
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

    const { data: newSchedule, error } = await supabase
      .from("maintenance_schedules")
      .insert([{
        asset_id: formAssetId,
        location_id: formLocationId,
        scheduled_date: scheduledDate,
        status: "Terjadwal",
      }])
      .select()
      .single();

    if (error || !newSchedule) {
      alert("Gagal menyimpan agenda: " + (error?.message || "unknown error"));
      setIsSaving(false);
      return;
    }

    const checklistPayload = validTasks.map((task, index) => ({
      schedule_id: newSchedule.id,
      task,
      status: "Belum",
      sort_order: index,
    }));

    const { error: checklistError } = await supabase.from("maintenance_checklist_items").insert(checklistPayload);

    if (checklistError) {
      alert("Agenda tersimpan, tapi gagal menyimpan checklist: " + checklistError.message);
    }

    // Tandai aset sedang dalam proses pemeliharaan terjadwal
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
        <div className="flex bg-[#E2E8F0] dark:bg-[#334155] p-1 rounded-xl">
          <button className="px-6 py-2 bg-white dark:bg-[#1E293B] rounded-lg text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] shadow-sm">Pemeliharaan Pencegahan</button>
          <Link href="/pemeliharaan/korektif" className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A]">Pemeliharaan Korektif</Link>
        </div>
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

          <div className="flex gap-3 pt-2">
             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-secondary dark:text-[#94A3B8] font-bold text-sm">Batalkan</button>
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