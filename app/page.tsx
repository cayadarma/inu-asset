"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StatCard from "../components/ui/StatCard";
import AvailabilityChart from "../components/ui/AvailabilityChart";
import StatusChart from "../components/ui/StatusChart";
import MaintenanceSummary from "../components/ui/MaintenanceSummary"; 
import RecentActivity from "../components/ui/RecentActivity"; 
// 1. Perbaikan Import Ikon
import { Box, Banknote, ShieldCheck, PlayCircle, Wrench, AlertCircle, ClipboardCheck, Package, Boxes, Wallet } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Lang } from "@/lib/i18n/dictionary";

// Format Rupiah singkat. Simbol "Rp" tetap sama di kedua bahasa (mata uangnya tetap IDR),
// tapi singkatan "Jt"/"M" (Bahasa Indonesia) diganti "M"/"B" (English) saat lang = en.
const formatRupiahShort = (n: number, lang: Lang) => {
  const bLabel = lang === "en" ? "B" : "M"; // Miliar
  const mLabel = lang === "en" ? "M" : "Jt"; // Juta
  return n >= 1_000_000_000
    ? `Rp ${(n / 1_000_000_000).toFixed(1)} ${bLabel}`
    : n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toFixed(1)} ${mLabel}`
    : `Rp ${n.toLocaleString(lang === "en" ? "en-US" : "id-ID")}`;
};

export default function Home() {
  const { t, lang } = useLanguage();
  // 2. Perbaikan State (Menambahkan active, maintenance, dan broken)
  const [counts, setCounts] = useState({
    total: 0,
    totalAset: 0,
    nonaktif: 0,
    active: 0,
    idle: 0,
    maintenance: 0,
    broken: 0,
    totalBiaya: 0,
    availability: "0%",
    addedThisYear: 0,
    addedThisMonth: 0,
    budgetAmount: 0,
    budgetUsedPct: 0,
    realisasiPct: 0,
    realisasiSelesai: 0,
    realisasiTotal: 0,
    biayaPemeliharaan: 0,
    biayaPerbaikan: 0,
    biayaStok: 0,
    biayaAset: 0,
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
        availability: `${availabilityPct.toFixed(1)}%`,
        addedThisYear,
        addedThisMonth,
      }));

      // --- SERAPAN BIAYA BULAN INI: GABUNGAN 4 KATEGORI (PEMELIHARAAN, PERBAIKAN, PEMBELIAN STOK, PEMBELIAN ASET) ---
      const nowForCost = new Date();
      const costYear = nowForCost.getFullYear();
      const costMonth = nowForCost.getMonth(); // 0-11
      const isThisMonth = (dateStr: string | null) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === costYear && d.getMonth() === costMonth;
      };

      // 1. Biaya Perbaikan (Work Order, dated by completed_at/created_at)
      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("actual_cost, completed_at, created_at")
        .gt("actual_cost", 0);
      const totalPerbaikanBulanIni = (workOrders || [])
        .filter((wo) => isThisMonth(wo.completed_at || wo.created_at))
        .reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);

      // 2. Biaya Pembelian Stok (dated by reference/created_at)
      const { data: movements } = await supabase
        .from("stock_movements")
        .select("qty, unit_price, reference, created_at")
        .eq("type", "Masuk")
        .not("unit_price", "is", null);
      const totalStokBulanIni = (movements || [])
        .filter((m) => isThisMonth(m.reference || m.created_at))
        .reduce((sum, m) => sum + (m.unit_price || 0) * (m.qty || 0), 0);

      // 3. Biaya Pemeliharaan (item checklist yang ada harganya, dated dari jadwal pemeliharaannya)
      const { data: checklistCosts } = await supabase
        .from("maintenance_checklist_items")
        .select("harga, maintenance_schedules(scheduled_date, completed_at)")
        .gt("harga", 0);
      const totalPemeliharaanBulanIni = (checklistCosts || [])
        .filter((c: any) => isThisMonth(c.maintenance_schedules?.completed_at || c.maintenance_schedules?.scheduled_date))
        .reduce((sum: number, c: any) => sum + (c.harga || 0), 0);

      // 4. Biaya Pembelian Aset (dated by purchase_date)
      const { data: assetsWithCost } = await supabase
        .from("assets")
        .select("purchase_cost, purchase_date")
        .gt("purchase_cost", 0);
      const totalAsetBulanIni = (assetsWithCost || [])
        .filter((a) => isThisMonth(a.purchase_date))
        .reduce((sum, a) => sum + (a.purchase_cost || 0), 0);

      const totalBiaya = totalPerbaikanBulanIni + totalStokBulanIni + totalPemeliharaanBulanIni + totalAsetBulanIni;

      // --- ANGGARAN PERUSAHAAN BULAN INI ---
      const { data: budgetRow } = await supabase
        .from("company_budgets")
        .select("amount")
        .eq("year", costYear)
        .eq("month", costMonth + 1)
        .maybeSingle();
      const budgetAmount = budgetRow?.amount || 0;
      const budgetUsedPct = budgetAmount > 0 ? Math.round((totalBiaya / budgetAmount) * 100) : 0;

      setCounts((prev) => ({
        ...prev,
        totalBiaya,
        budgetAmount,
        budgetUsedPct,
        biayaPemeliharaan: totalPemeliharaanBulanIni,
        biayaPerbaikan: totalPerbaikanBulanIni,
        biayaStok: totalStokBulanIni,
        biayaAset: totalAsetBulanIni,
      }));

      // --- REALISASI PROGRAM KERJA (PREVENTIVE MAINTENANCE) BULAN INI ---
      // Hanya dari agenda pemeliharaan pencegahan (BUKAN Work Order korektif/perbaikan).
      const monthStart = `${costYear}-${String(costMonth + 1).padStart(2, "0")}-01`;
      const monthEndDate = new Date(costYear, costMonth + 1, 0); // hari terakhir bulan ini
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

      // --- CATAT "POTRET" STATUS ASET HARI INI UNTUK GRAFIK TREN, PER LOKASI ---
      // Di-upsert (insert atau update jika sudah ada) berdasarkan (snapshot_date, location_id),
      // supaya selalu mencerminkan kondisi terbaru pada hari berjalan, per lokasi.
      // "Semua Lokasi" tidak disimpan sebagai baris sendiri -- dijumlahkan on-the-fly
      // dari baris-baris per lokasi ini saat ditampilkan di grafik.
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
            title={t("dashboard.assetAvailability")}
            value={counts.availability}
            description={t("dashboard.assetAvailabilityDesc")}
            icon={<ShieldCheck size={20} />}
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
          <StatCard
            title={t("dashboard.unitBeroperasi")}
            value={counts.active}
            description={t("dashboard.unitBeroperasiDesc")}
            icon={<PlayCircle size={20} className="text-emerald-500" />}
          />
          <StatCard
            title={t("dashboard.unitPemeliharaan")}
            value={counts.maintenance}
            description={t("dashboard.unitPemeliharaanDesc")}
            icon={<Wrench size={20} className="text-amber-500" />}
          />
          <StatCard
            title={t("dashboard.unitRusakPerbaikan")}
            value={counts.broken}
            description={t("dashboard.unitRusakPerbaikanDesc")}
            icon={<AlertCircle size={20} className="text-red-500" />}
          />
        </div>
      </div>

      {/* DAFTAR WORK ORDER */}
      <div className="w-full">
        <MaintenanceSummary />
      </div>

      {/* RINGKASAN KEUANGAN/MANAJEMEN */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base uppercase tracking-wider">{t("dashboard.ringkasanKeuangan")}</h3>
          <p className="text-[#94A3B8] text-xs mt-1">{t("dashboard.ringkasanKeuanganDesc")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <StatCard
            title={t("dashboard.anggaranBulanIni")}
            value={counts.budgetAmount > 0 ? formatRupiahShort(counts.budgetAmount, lang) : t("dashboard.belumDiatur")}
            description={t("dashboard.anggaranBulanIniDesc")}
            icon={<Wallet size={20} />}
            href="/anggaran"
          />
          <StatCard
            title={t("dashboard.serapanBiayaBulanIni")}
            value={formatRupiahShort(counts.totalBiaya, lang)}
            description={t("dashboard.serapanBiayaBulanIniDesc")}
            icon={<Banknote size={20} />}
            href="/analisis-biaya"
            extra={
              counts.budgetAmount > 0 ? (
                <span className={`text-[11px] font-bold ${counts.budgetUsedPct >= 100 ? "text-[#EF4444]" : counts.budgetUsedPct >= 80 ? "text-[#F59E0B]" : "text-[#0D9488]"}`}>
                  {t("dashboard.anggaranTerpakai", { pct: counts.budgetUsedPct })}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#94A3B8] italic">{t("dashboard.anggaranBelumDiatur")}</span>
              )
            }
          />
          <StatCard
            title={t("dashboard.biayaPemeliharaan")}
            value={formatRupiahShort(counts.biayaPemeliharaan, lang)}
            description={t("dashboard.biayaPemeliharaanDesc")}
            icon={<ClipboardCheck size={20} />}
            href="/analisis-biaya"
          />
          <StatCard
            title={t("dashboard.biayaPerbaikan")}
            value={formatRupiahShort(counts.biayaPerbaikan, lang)}
            description={t("dashboard.biayaPerbaikanDesc")}
            icon={<Wrench size={20} />}
            href="/analisis-biaya"
          />
          <StatCard
            title={t("dashboard.biayaPembelianStok")}
            value={formatRupiahShort(counts.biayaStok, lang)}
            description={t("dashboard.biayaPembelianStokDesc")}
            icon={<Package size={20} />}
            href="/analisis-biaya"
          />
          <StatCard
            title={t("dashboard.biayaPembelianAset")}
            value={formatRupiahShort(counts.biayaAset, lang)}
            description={t("dashboard.biayaPembelianAsetDesc")}
            icon={<Boxes size={20} />}
            href="/analisis-biaya"
          />
        </div>
      </div>

      {/* TREN STATUS ASET / MONITORING STATUS BULANAN */}
      <div className="w-full">
        <AvailabilityChart />
      </div>

      {/* STATUS OPERASIONAL & AKTIVITAS TERBARU */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StatusChart />
        <RecentActivity />
      </div>

    </main>
  );
}