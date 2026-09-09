"use client";

import React, { useEffect, useState } from "react";
import { Search, Eye, ChevronLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

export default function SemuaAsetPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE FILTER & SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("Semua Tipe");
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [filterLocation, setFilterLocation] = useState("Semua Lokasi");

  const fetchAssets = async () => {
    setIsLoading(true);

    const { data: assetData, error } = await supabase
      .from("assets")
      .select("*, locations ( id, name )")
      .order("created_at", { ascending: true });

    if (!error && assetData) setAssets(assetData);
    setIsLoading(false);
  };

  const fetchFilters = async () => {
    const { data: types } = await supabase.from("asset_types").select("name").order("name", { ascending: true });
    if (types) setAvailableTypes(types);

    const { data: locations } = await supabase.from("locations").select("id, name").order("name", { ascending: true });
    if (locations) setAvailableLocations(locations);
  };

  useEffect(() => {
    fetchAssets();
    fetchFilters();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "Semua Tipe" || asset.type === filterType;
    const matchesStatus = filterStatus === "Semua Status" || asset.status === filterStatus;
    const matchesLocation = filterLocation === "Semua Lokasi" || asset.locations?.id === filterLocation;

    return matchesSearch && matchesType && matchesStatus && matchesLocation;
  });

  return (
    <div className="flex flex-col gap-6 font-poppins text-left pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-white dark:hover:bg-[#1E293B] rounded-full transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-[#334155]">
          <ChevronLeft size={24} className="text-[#0F172A] dark:text-[#F8FAFC]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Seluruh Aset</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Menampilkan {filteredAssets.length} aset di seluruh lokasi</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Cari kode/nama aset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary transition-all dark:text-white"
          />
        </div>

        <div className="relative">
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer"
          >
            <option value="Semua Lokasi">Semua Lokasi</option>
            {availableLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        </div>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer">
          <option>Semua Tipe</option>
          {availableTypes.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#F8FAFC] outline-none focus:border-primary cursor-pointer">
          <option>Semua Status</option><option>Beroperasi</option><option>Idle</option><option>Pemeliharaan</option><option>Rusak</option><option>Perbaikan</option>
        </select>
      </div>

      {/* Tabel Section */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center text-[#94A3B8]">Memproses data...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-20 text-center text-[#94A3B8]">Aset tidak ditemukan.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b border-gray-100 dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] text-sm font-bold">
                  <th className="px-6 py-4">Kode Aset</th>
                  <th className="px-6 py-4">Nama Aset</th>
                  <th className="px-6 py-4">Tipe Aset</th>
                  <th className="px-6 py-4">Lokasi</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/30 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset.id}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{asset.name}</td>
                    <td className="px-6 py-5 text-sm text-[#475569] dark:text-[#94A3B8]">{asset.type}</td>
                    <td className="px-6 py-5 text-sm text-[#475569] dark:text-[#94A3B8] uppercase">{asset.locations?.name || "-"}</td>
                    <td className="px-6 py-5 text-center"><Badge status={asset.status} /></td>
                    <td className="px-6 py-5 text-center">
                      <Link
                        href={`/registrasi-aset/${asset.location_id}/${asset.id}?name=${encodeURIComponent(asset.locations?.name || "")}&assetName=${encodeURIComponent(asset.name)}`}
                        className="p-2 inline-block text-[#64748B] hover:text-primary transition-all"
                      >
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}