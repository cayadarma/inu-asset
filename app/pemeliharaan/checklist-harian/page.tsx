"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardCheck, ClipboardX, MapPin, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MaintenanceTabs from "@/components/maintenance/MaintenanceTabs";
import { getWitaDateStr } from "@/lib/assetSnapshot";
import { formatTanggalPanjang, resolveChecklistDate } from "@/lib/checklistDate";
import { useDynamicText } from "@/lib/i18n/useDynamicText";

interface AssetRow {
  id: string;
  name: string;
  type: string;
  location_id: string | null;
  checklist_category: string | null;
  locations: { name: string } | null;
}

interface LocationGroup {
  id: string;
  name: string;
  assets: AssetRow[];
}

// Alur bertingkat:
//   Level 1 (tanpa ?lokasi=)  -> daftar kartu lokasi
//   Level 2 (?lokasi=<id>)    -> daftar aset di lokasi itu (search + filter status tetap ada)
// Tanggal (?date=) tampil di kedua level dan selalu ikut terbawa saat pindah level.
function LocationCard({
  name,
  total,
  belum,
  href,
}: {
  name: string;
  total: number;
  belum: number;
  href: string;
}) {
  const displayName = useDynamicText(name);
  return (
    <Link
      href={href}
      className="group bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-primary transition-all p-6 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div className="w-12 h-12 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488] flex-shrink-0">
          <MapPin size={24} />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-tight truncate">
            {displayName}
          </span>
          <span className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">{total} aset dengan checklist</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {belum > 0 ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-[#FEE2E2] dark:bg-[#EF4444]/20 text-[#991B1B] dark:text-[#EF4444]">
            <ClipboardX size={13} /> {belum} Belum Diisi
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-[#D1FAE5] dark:bg-[#115E59]/30 text-[#065F46] dark:text-[#37BAAE]">
            <ClipboardCheck size={13} /> Semua Sudah Diisi
          </span>
        )}
        <ChevronRight size={20} className="text-[#94A3B8] group-hover:text-[#0D9488] transition-colors" />
      </div>
    </Link>
  );
}

function LocationTitle({ name }: { name: string }) {
  const displayName = useDynamicText(name);
  return <>{displayName}</>;
}

function ChecklistHarianListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tanggal checklist = ?date= dari URL (dibawa dari kalender Pemeliharaan Pencegahan),
  // kalau kosong/tidak valid -> hari ini (WITA). Tanggal masa depan dipotong ke hari ini.
  const todayStr = getWitaDateStr();
  const { date, clamped } = resolveChecklistDate(searchParams.get("date"), todayStr);
  const isToday = date === todayStr;
  const lokasiId = searchParams.get("lokasi");

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [filledAssetIds, setFilledAssetIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "sudah" | "belum">("semua");

  const buildUrl = (d: string, lokasi?: string | null) =>
    `/pemeliharaan/checklist-harian?date=${d}${lokasi ? `&lokasi=${lokasi}` : ""}`;

  const fetchData = async () => {
    setIsLoading(true);

    const [{ data: assetData }, { data: checklistData }] = await Promise.all([
      supabase
        .from("assets")
        .select("id, name, type, location_id, checklist_category, locations ( name )")
        .eq("is_active", true)
        .not("checklist_category", "is", null)
        .order("name", { ascending: true }),
      supabase.from("daily_checklists").select("asset_id").eq("tanggal", date),
    ]);

    if (assetData) setAssets(assetData as any);
    setFilledAssetIds(new Set((checklistData || []).map((c: any) => c.asset_id)));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Pencarian & filter status di-reset setiap pindah lokasi
  useEffect(() => {
    setSearch("");
    setFilterStatus("semua");
  }, [lokasiId]);

  const goToDate = (newDate: string) => {
    if (!newDate) return;
    router.replace(buildUrl(newDate, lokasiId));
  };

  // Kelompokkan aset per lokasi (semua aset wajib punya lokasi saat registrasi)
  const locationGroups: LocationGroup[] = useMemo(() => {
    const map = new Map<string, LocationGroup>();
    for (const asset of assets) {
      if (!asset.location_id) continue;
      const group = map.get(asset.location_id) || {
        id: asset.location_id,
        name: asset.locations?.name || "-",
        assets: [],
      };
      group.assets.push(asset);
      map.set(asset.location_id, group);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  // ?lokasi= yang tidak dikenal (mis. lokasi dihapus / tidak punya aset ber-checklist)
  // diperlakukan seperti belum memilih lokasi -> tampilkan daftar lokasi.
  const selectedGroup = lokasiId ? locationGroups.find((g) => g.id === lokasiId) : undefined;

  // Ringkasan mengikuti level: semua lokasi (level 1) atau lokasi terpilih (level 2)
  const scopeAssets = selectedGroup ? selectedGroup.assets : assets;
  const totalSudah = scopeAssets.filter((a) => filledAssetIds.has(a.id)).length;
  const totalBelum = scopeAssets.length - totalSudah;
  const hariLabel = isToday ? "Hari Ini" : "Tanggal Ini";

  const filteredAssets = (selectedGroup ? selectedGroup.assets : []).filter((asset) => {
    const matchesSearch =
      asset.id.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.type?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const sudahDiisi = filledAssetIds.has(asset.id);
    if (filterStatus === "sudah") return sudahDiisi;
    if (filterStatus === "belum") return !sudahDiisi;
    return true;
  });

  // --- CARI SEMUA ASET (level 1): cocokkan kode, nama, tipe, atau nama lokasi tanpa harus memilih lokasi dulu ---
  const globalQuery = search.trim().toLowerCase();
  const isGlobalSearching = !selectedGroup && globalQuery !== "";
  const globalResults = isGlobalSearching
    ? assets.filter(
        (asset) =>
          asset.id.toLowerCase().includes(globalQuery) ||
          asset.name.toLowerCase().includes(globalQuery) ||
          asset.type?.toLowerCase().includes(globalQuery) ||
          asset.locations?.name?.toLowerCase().includes(globalQuery)
      )
    : [];

  // Satu baris aset (dipakai di hasil pencarian semua aset dan di daftar aset per lokasi)
  const renderAssetRow = (asset: AssetRow, showLocation: boolean) => {
    const sudahDiisi = filledAssetIds.has(asset.id);
    return (
      <Link
        key={asset.id}
        href={`/pemeliharaan/checklist-harian/${asset.id}?date=${date}`}
        className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-50 dark:border-[#334155] last:border-0 hover:bg-gray-50 dark:hover:bg-[#0F172A]/50 transition-all group"
      >
        <div className="flex flex-col gap-1">
          <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[15px] group-hover:text-[#0D9488] transition-colors">
            {asset.id} - {asset.name}
          </span>
          <span className="text-xs text-[#94A3B8] font-medium">
            {asset.type}
            {showLocation && asset.locations?.name && (
              <>
                {" • "}
                <LocationTitle name={asset.locations.name} />
              </>
            )}
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
  };

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Checklist Harian Aset</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Pemeriksaan kondisi harian per aset, termasuk tanggal lampau yang terlewat</p>
        </div>
        <MaintenanceTabs active="checklist-harian" date={date} />
      </div>

      {/* PILIH TANGGAL */}
      <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Tanggal Checklist</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => goToDate(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold outline-none focus:border-primary bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white"
              />
              {!isToday && (
                <button
                  type="button"
                  onClick={() => goToDate(todayStr)}
                  className="px-3 py-2.5 bg-[#CCFBF1] dark:bg-[#115E59]/30 text-[#0D9488] dark:text-[#37BAAE] rounded-xl text-xs font-bold hover:bg-[#0D9488] hover:text-white transition-all"
                >
                  Hari Ini
                </button>
              )}
            </div>
            <span className="text-[11px] text-[#94A3B8]">{formatTanggalPanjang(date)}</span>
          </div>
        </div>

        {clamped && (
          <p className="text-xs font-bold text-[#F59E0B]">
            Tanggal yang dipilih di kalender belum tiba, jadi ditampilkan hari ini. Checklist tidak bisa diisi untuk tanggal yang belum terjadi.
          </p>
        )}
      </div>

      {/* RINGKASAN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Total Aset Aktif</span>
          <span className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{scopeAssets.length}</span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Sudah Diisi {hariLabel}</span>
          <span className="text-2xl font-bold text-[#0D9488]">{totalSudah}</span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Belum Diisi {hariLabel}</span>
          <span className="text-2xl font-bold text-[#EF4444]">{totalBelum}</span>
        </div>
      </div>

      {isLoading ? (
        <p className="p-10 text-center text-sm text-secondary dark:text-[#94A3B8] italic">Memuat...</p>
      ) : !selectedGroup ? (
        /* LEVEL 1: CARI SEMUA ASET / PILIH LOKASI */
        <div className="flex flex-col gap-4">
          {/* Cari semua aset tanpa harus klik lokasi dulu */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari semua aset: kode, nama, tipe, atau lokasi..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary bg-white dark:bg-[#1E293B] font-medium text-[#0F172A] dark:text-white"
            />
          </div>

          {isGlobalSearching ? (
            <>
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                Hasil Pencarian ({globalResults.length})
              </span>
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
                {globalResults.length === 0 ? (
                  <p className="p-10 text-center text-sm text-secondary italic">Tidak ada aset yang cocok.</p>
                ) : (
                  globalResults.map((asset) => renderAssetRow(asset, true))
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Pilih Lokasi</span>
              {locationGroups.length === 0 ? (
                <p className="p-10 text-center text-sm text-secondary dark:text-[#94A3B8] italic bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155]">
                  Belum ada aset dengan Kategori Checklist.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {locationGroups.map((group) => (
                    <LocationCard
                      key={group.id}
                      name={group.name}
                      total={group.assets.length}
                      belum={group.assets.filter((a) => !filledAssetIds.has(a.id)).length}
                      href={buildUrl(date, group.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* LEVEL 2: DAFTAR ASET DI LOKASI TERPILIH */
        <>
          <div className="flex items-center justify-between gap-4">
            <Link
              href={buildUrl(date)}
              className="flex items-center gap-1.5 text-sm font-bold text-[#94A3B8] hover:text-[#0D9488] transition-colors w-fit shrink-0"
            >
              <ChevronLeft size={16} /> Semua Lokasi
            </Link>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-tight flex items-center gap-2 text-right min-w-0">
              <MapPin size={18} className="text-[#0D9488] shrink-0" />
              <span className="truncate">
                <LocationTitle name={selectedGroup.name} />
              </span>
            </h2>
          </div>

          {/* FILTER & SEARCH */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode, nama, atau tipe aset..."
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
            {filteredAssets.length === 0 ? (
              <p className="p-10 text-center text-sm text-secondary dark:text-[#94A3B8] italic">Tidak ada aset yang cocok.</p>
            ) : (
              filteredAssets.map((asset) => renderAssetRow(asset, false))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Wrapper Suspense: useSearchParams wajib dibungkus agar build Next.js tidak error
export default function ChecklistHarianListPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold dark:text-white">Memuat...</div>}>
      <ChecklistHarianListContent />
    </Suspense>
  );
}