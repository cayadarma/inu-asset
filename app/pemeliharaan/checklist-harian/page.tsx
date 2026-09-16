"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, ClipboardX, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MaintenanceTabs from "@/components/maintenance/MaintenanceTabs";

interface AssetRow {
  id: string;
  name: string;
  type: string;
  location_id: string | null;
  checklist_category: string | null;
  locations: { name: string } | null;
}

function getTodayDateString() {
  // Format YYYY-MM-DD sesuai kolom DATE di Postgres, berdasarkan waktu lokal browser
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ChecklistHarianListPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [filledAssetIds, setFilledAssetIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "sudah" | "belum">("semua");

  const today = getTodayDateString();

  const fetchData = async () => {
    setIsLoading(true);

    const [{ data: assetData }, { data: checklistData }] = await Promise.all([
      supabase
        .from("assets")
        .select("id, name, type, location_id, checklist_category, locations ( name )")
        .eq("is_active", true)
        .not("checklist_category", "is", null)
        .order("name", { ascending: true }),
      supabase
        .from("daily_checklists")
        .select("asset_id")
        .eq("tanggal", today),
    ]);

    if (assetData) setAssets(assetData as any);
    if (checklistData) setFilledAssetIds(new Set(checklistData.map((c: any) => c.asset_id)));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.type?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const sudahDiisi = filledAssetIds.has(asset.id);
    if (filterStatus === "sudah") return sudahDiisi;
    if (filterStatus === "belum") return !sudahDiisi;
    return true;
  });

  const totalSudah = assets.filter((a) => filledAssetIds.has(a.id)).length;
  const totalBelum = assets.length - totalSudah;

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Checklist Harian Aset</h1>
          <p className="text-sm text-[#94A3B8]">
            Pemeriksaan kondisi harian per part untuk setiap aset. Wajib diisi setiap hari.
            Hanya menampilkan aset yang sudah punya Kategori Checklist.
          </p>
        </div>
        <MaintenanceTabs active="checklist-harian" />
      </div>

      {/* RINGKASAN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Total Aset Aktif</span>
          <span className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{assets.length}</span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Sudah Diisi Hari Ini</span>
          <span className="text-2xl font-bold text-[#0D9488]">{totalSudah}</span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Belum Diisi Hari Ini</span>
          <span className="text-2xl font-bold text-[#EF4444]">{totalBelum}</span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau tipe aset..."
            className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary bg-white dark:bg-[#1E293B] font-medium text-[#0F172A] dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          {(["semua", "belum", "sudah"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-3 rounded-xl text-sm font-bold capitalize transition-all ${
                filterStatus === f
                  ? "bg-[#0D9488] text-white"
                  : "bg-white dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] border border-gray-200 dark:border-[#334155]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* DAFTAR ASET */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="p-10 text-center text-sm text-secondary italic">Memuat...</p>
        ) : filteredAssets.length === 0 ? (
          <p className="p-10 text-center text-sm text-secondary italic">Tidak ada aset yang cocok.</p>
        ) : (
          filteredAssets.map((asset) => {
            const sudahDiisi = filledAssetIds.has(asset.id);
            return (
              <Link
                key={asset.id}
                href={`/pemeliharaan/checklist-harian/${asset.id}`}
                className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-50 dark:border-[#334155] last:border-0 hover:bg-gray-50 dark:hover:bg-[#0F172A]/50 transition-all group"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[15px] group-hover:text-[#0D9488] transition-colors">
                    {asset.name}
                  </span>
                  <span className="text-xs text-[#94A3B8] font-medium">
                    {asset.type} {asset.locations?.name ? `• ${asset.locations.name}` : ""}
                  </span>
                </div>
                {sudahDiisi ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-[#D1FAE5] dark:bg-[#115E59]/30 text-[#065F46] dark:text-[#37BAAE]">
                    <ClipboardCheck size={13} /> Sudah Diisi
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-[#FEE2E2] dark:bg-[#EF4444]/20 text-[#991B1B] dark:text-[#EF4444]">
                    <ClipboardX size={13} /> Belum Diisi
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}