"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "../components/ui/StatCard";
import AvailabilitySummaryCard from "../components/ui/AvailabilitySummaryCard";
import BudgetSummaryCards from "../components/ui/BudgetSummaryCards";
import StatusChart from "../components/ui/StatusChart";
import MaintenanceSummary from "../components/ui/MaintenanceSummary"; 
import RecentActivity from "../components/ui/RecentActivity"; 
import { Box, ClipboardCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const [counts, setCounts] = useState({
    total: 0,
    totalAset: 0,
    nonaktif: 0,
    active: 0,
    idle: 0,
    maintenance: 0,
    broken: 0,
    availabilityPct: 0,
    addedThisYear: 0,
    addedThisMonth: 0,
    realisasiPct: 0,
    realisasiSelesai: 0,
    realisasiTotal: 0,
  });

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from("assets").select("status, purchase_date, is_active, location_id");
      if (!data) return;

      // PENTING: aset yang sudah dinonaktifkan (is_active === false) dikeluarkan dari
      // perhitungan status & availability. Aset nonaktif dianggap tidak beroperasi dan tidak
      // termasuk kategori apa pun (Beroperasi/Idle/Pemeliharaan/Perbaikan/Rusak), berapa pun
      // nilai `status` terakhirnya sebelum dinonaktifkan.
      //
      // TAPI aset nonaktif tetap milik perusahaan — jadi "Total Seluruh Aset" (totalAset)
      // sengaja TIDAK mengecualikan aset nonaktif, berbeda dengan `total` di bawah yang
      // khusus jadi denominator availability (sengaja eksklusif, karena availability menjawab
      // "dari aset yang seharusnya beroperasi, berapa persen yang tersedia").
      const totalAset = data.length;
      const nonaktifCount = data.filter((a) => a.is_active === false).length;

      const operationalAssets = data.filter((a) => a.is_active !== false);

      const total = operationalAssets.length;
      const active = operationalAssets.filter((a) => a.status === "Beroperasi").length;
      const idle = operationalAssets.filter((a) => a.status === "Idle").length;
      const maintenance = operationalAssets.filter((a) => a.status === "Pemeliharaan").length;
      const perbaikan = operationalAssets.filter((a) => a.status === "Perbaikan").length;
      const rusak = operationalAssets.filter((a) => a.status === "Rusak").length;

      // --- AKUMULASI PENAMBAHAN ASET (BERDASARKAN TANGGAL PEMBELIAN, BUKAN TANGGAL INPUT) ---
      // Catatan: akumulasi ini SENGAJA tetap memakai seluruh data (termasuk aset nonaktif),
      // karena ini menghitung riwayat penambahan aset dari waktu ke waktu, bukan status
      // operasional saat ini — aset yang dinonaktifkan tetap pernah dibeli pada tanggal itu.
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth();
      const addedThisYear = data.filter((a) => a.purchase_date && new Date(a.purchase_date).getFullYear() === thisYear).length;
      const addedThisMonth = data.filter((a) => {
        if (!a.purchase_date) return false;
        const d = new Date(a.purchase_date);
        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
      }).length;

      // --- ASSET AVAILABILITY: STATUS "BEROPERASI", "IDLE" & "PEMELIHARAAN" DIHITUNG TERSEDIA ---
      // Status "Rusak" dan "Perbaikan" TIDAK dihitung sebagai tersedia.
      const availabilityPct = total > 0 ? ((active + idle + maintenance) / total) * 100 : 0;

      setCounts((prev) => ({
        ...prev,
        total,
        totalAset,
        nonaktif: nonaktifCount,
        active,
        idle,
        maintenance,
        broken: rusak + perbaikan,
        availabilityPct,
        addedThisYear,
        addedThisMonth,
      }));

      // --- CATAT "POTRET" STATUS ASET HARI INI UNTUK GRAFIK TREN (HALAMAN LAPORAN), PER LOKASI ---
      // Di-upsert (insert atau update jika sudah ada) berdasarkan (snapshot_date, location_id),
      // supaya selalu mencerminkan kondisi terbaru pada hari berjalan, per lokasi.
      // "Semua Lokasi" tidak disimpan sebagai baris sendiri -- dijumlahkan on-the-fly
      // dari baris-baris per lokasi ini saat ditampilkan di grafik.
      // NB: blok ini sekarang dijalankan LEBIH DULU (sebelum query realisasi program kerja),
      // supaya snapshot tetap tercatat walau query lain di bawah gagal.
      const today = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
      const byLocation = new Map<
        string | null,
        { beroperasi: number; idle: number; pemeliharaan: number; perbaikan: number; rusak: number; total: number }
      >();
      operationalAssets.forEach((a: any) => {
        const locId = a.location_id ?? null;
        const entry = byLocation.get(locId) || { beroperasi: 0, idle: 0, pemeliharaan: 0, perbaikan: 0, rusak: 0, total: 0 };
        entry.total += 1;
        if (a.status === "Beroperasi") entry.beroperasi += 1;
        else if (a.status === "Idle") entry.idle += 1;
        else if (a.status === "Pemeliharaan") entry.pemeliharaan += 1;
        else if (a.status === "Perbaikan") entry.perbaikan += 1;
        else if (a.status === "Rusak") entry.rusak += 1;
        byLocation.set(locId, entry);
      });

      const snapshotRows = Array.from(byLocation.entries()).map(([location_id, c]) => ({
        snapshot_date: today,
        location_id,
        beroperasi: c.beroperasi,
        idle: c.idle,
        pemeliharaan: c.pemeliharaan,
        perbaikan: c.perbaikan,
        rusak: c.rusak,
        total: c.total,
        source: "live", // penanda: baris ini dari pantauan real-time, JANGAN ditimpa oleh trigger recompute historis
        updated_at: new Date().toISOString(),
      }));

      if (snapshotRows.length > 0) {
        await supabase.from("asset_status_snapshots").upsert(
          snapshotRows,
          { onConflict: "snapshot_date,location_id" }
        );
      }

      // --- REALISASI PROGRAM KERJA (PREVENTIVE MAINTENANCE) BULAN INI ---
      // Hanya dari agenda pemeliharaan pencegahan (BUKAN Work Order korektif/perbaikan).
      const monthStart = `${thisYear}-${String(thisMonth + 1).padStart(2, "0")}-01`;
      const monthEndDate = new Date(thisYear, thisMonth + 1, 0); // hari terakhir bulan ini
      const monthEnd = monthEndDate.toISOString().slice(0, 10);

      const { data: agendaBulanIni } = await supabase
        .from("maintenance_schedules")
        .select("status")
        .gte("scheduled_date", monthStart)
        .lte("scheduled_date", monthEnd);

      const realisasiTotal = (agendaBulanIni || []).length;
      const realisasiSelesai = (agendaBulanIni || []).filter((a) => a.status === "Selesai").length;
      const realisasiPct = realisasiTotal > 0 ? Math.round((realisasiSelesai / realisasiTotal) * 100) : 0;

      setCounts((prev) => ({ ...prev, realisasiPct, realisasiSelesai, realisasiTotal }));
    }
    getStats();
  }, []);

  return (
    <main className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-10 font-poppins text-left transition-all duration-300">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("dashboard.overview")}</h1>
      </div>

      {/* RINGKASAN ASET */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base uppercase tracking-wider">{t("dashboard.ringkasanAset")}</h3>
          <p className="text-[#94A3B8] text-xs mt-1">{t("dashboard.ringkasanAsetDesc")}</p>
        </div>

        {/* Kiri (1/3): Total Aset + Realisasi Program Kerja. Kanan (2/3): Asset Availability gabungan.
            Urutan DOM = urutan di HP: Total Aset, Realisasi, lalu Availability. */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 flex flex-col gap-6">
            <StatCard
              title={t("dashboard.totalSeluruhAset")}
              value={counts.totalAset.toLocaleString()}
              description={t("dashboard.totalSeluruhAsetDesc", { year: new Date().getFullYear() })}
              icon={<Box size={20} />}
              href="/registrasi-aset/semua"
              extra={
                <div className="flex flex-col gap-0.5 text-[11px] font-bold">
                  <span className="text-[#0D9488]">{t("dashboard.newAssetsYear", { count: counts.addedThisYear })}</span>
                  <span className="text-[#94A3B8]">{t("dashboard.newAssetsMonth", { count: counts.addedThisMonth })}</span>
                  {counts.nonaktif > 0 && (
                    <span className="text-[#94A3B8]">{t("dashboard.includingInactive", { count: counts.nonaktif })}</span>
                  )}
                </div>
              }
            />
            <StatCard
              title={t("dashboard.realisasiProgramKerja")}
              value={`${counts.realisasiPct}%`}
              description={t("dashboard.realisasiProgramKerjaDesc")}
              icon={<ClipboardCheck size={20} />}
              href="/pemeliharaan"
              extra={
                <span className="text-[11px] font-bold text-[#94A3B8]">
                  {t("dashboard.agendaSelesai", { selesai: counts.realisasiSelesai, total: counts.realisasiTotal })}
                </span>
              }
            />
          </div>

          <div className="xl:col-span-2">
            <AvailabilitySummaryCard
              availabilityPct={counts.availabilityPct}
              totalActive={counts.total}
              active={counts.active}
              maintenance={counts.maintenance}
              broken={counts.broken}
            />
          </div>
        </div>
      </div>

      {/* DAFTAR WORK ORDER */}
      <div className="w-full">
        <MaintenanceSummary />
      </div>

      {/* RINGKASAN KEUANGAN/MANAJEMEN (2 card: per bulan & kumulatif s.d bulan terpilih) */}
      <BudgetSummaryCards />

      {/* STATUS OPERASIONAL & AKTIVITAS TERBARU */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StatusChart />
        <RecentActivity />
      </div>

    </main>
  );
}