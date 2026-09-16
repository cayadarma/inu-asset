"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Kondisi = "baik" | "cukup" | "kurang";

interface PartRow {
  id: string;
  part_name: string;
  urutan: number;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const KONDISI_OPTIONS: { value: Kondisi; label: string; activeClass: string }[] = [
  { value: "baik", label: "Baik", activeClass: "bg-[#D1FAE5] dark:bg-[#115E59]/40 border-[#0D9488] text-[#065F46] dark:text-[#37BAAE]" },
  { value: "cukup", label: "Cukup", activeClass: "bg-[#FFF7D6] dark:bg-[#F59E0B]/25 border-[#F59E0B] text-[#E28E00] dark:text-[#F59E0B]" },
  { value: "kurang", label: "Kurang", activeClass: "bg-[#FEE2E2] dark:bg-[#EF4444]/25 border-[#EF4444] text-[#991B1B] dark:text-[#EF4444]" },
];

export default function ChecklistHarianFormPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [asset, setAsset] = useState<any>(null);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [existingChecklist, setExistingChecklist] = useState<any>(null);
  const [existingItems, setExistingItems] = useState<Record<string, { kondisi: Kondisi; catatan: string }>>({});
  const [answers, setAnswers] = useState<Record<string, { kondisi: Kondisi | null; catatan: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const today = getTodayDateString();
  const sudahDiisi = !!existingChecklist;

  const fetchData = async () => {
    setIsLoading(true);

    const [{ data: assetData }, { data: partsData }, { data: checklistData }] = await Promise.all([
      supabase.from("assets").select("id, name, type").eq("id", assetId).maybeSingle(),
      supabase
        .from("asset_checklist_parts")
        .select("id, part_name, urutan")
        .eq("asset_id", assetId)
        .eq("is_active", true)
        .order("urutan", { ascending: true }),
      supabase
        .from("daily_checklists")
        .select("*, daily_checklist_items ( asset_checklist_part_id, kondisi, catatan )")
        .eq("asset_id", assetId)
        .eq("tanggal", today)
        .maybeSingle(),
    ]);

    if (assetData) setAsset(assetData);
    if (partsData) setParts(partsData);

    if (checklistData) {
      setExistingChecklist(checklistData);
      const itemsMap: Record<string, { kondisi: Kondisi; catatan: string }> = {};
      (checklistData.daily_checklist_items || []).forEach((item: any) => {
        itemsMap[item.asset_checklist_part_id] = { kondisi: item.kondisi, catatan: item.catatan || "" };
      });
      setExistingItems(itemsMap);
    } else {
      // Siapkan state jawaban kosong untuk part yang ada
      const initialAnswers: Record<string, { kondisi: Kondisi | null; catatan: string }> = {};
      (partsData || []).forEach((p: any) => {
        initialAnswers[p.id] = { kondisi: null, catatan: "" };
      });
      setAnswers(initialAnswers);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const handleSetKondisi = (partId: string, kondisi: Kondisi) => {
    setAnswers((prev) => ({ ...prev, [partId]: { ...prev[partId], kondisi } }));
  };

  const handleSetCatatan = (partId: string, catatan: string) => {
    setAnswers((prev) => ({ ...prev, [partId]: { ...prev[partId], catatan } }));
  };

  const allAnswered = parts.length > 0 && parts.every((p) => answers[p.id]?.kondisi);

  const handleSubmit = async () => {
    if (!user) {
      alert("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }
    if (!allAnswered) {
      alert("Semua part wajib dinilai (Baik/Cukup/Kurang) sebelum disimpan.");
      return;
    }

    setIsSaving(true);

    // 1. Buat sesi daily_checklists untuk aset + tanggal hari ini
    const { data: checklistRow, error: checklistError } = await supabase
      .from("daily_checklists")
      .insert({
        asset_id: assetId,
        tanggal: today,
        diisi_oleh_id: user.id,
        diisi_oleh_nama: user.name,
      })
      .select()
      .single();

    if (checklistError || !checklistRow) {
      // Kemungkinan besar sudah ada sesi untuk hari ini (unique constraint asset_id+tanggal)
      alert("Gagal menyimpan checklist. Kemungkinan checklist untuk aset ini hari ini sudah diisi oleh orang lain. Silakan refresh halaman.");
      setIsSaving(false);
      await fetchData();
      return;
    }

    // 2. Simpan item-item penilaian per part
    const itemsToInsert = parts.map((p) => ({
      daily_checklist_id: checklistRow.id,
      asset_checklist_part_id: p.id,
      kondisi: answers[p.id]?.kondisi,
      catatan: answers[p.id]?.catatan?.trim() || null,
    }));

    const { error: itemsError } = await supabase.from("daily_checklist_items").insert(itemsToInsert);

    if (itemsError) {
      alert("Gagal menyimpan detail checklist: " + itemsError.message);
      // Rollback sesi checklist supaya tidak ada data setengah jadi
      await supabase.from("daily_checklists").delete().eq("id", checklistRow.id);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.push("/pemeliharaan/checklist-harian");
  };

  if (isLoading) return <div className="p-20 text-center font-bold dark:text-white">Memuat...</div>;
  if (!asset) return <div className="p-20 text-center text-red-500 font-bold">Aset tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left max-w-3xl">
      <Link href="/pemeliharaan/checklist-harian" className="flex items-center gap-1.5 text-sm font-bold text-[#94A3B8] hover:text-[#0D9488] transition-colors w-fit">
        <ChevronLeft size={16} /> Kembali ke Daftar Checklist Harian
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{asset.name}</h1>
        <p className="text-sm text-[#94A3B8]">
          {asset.type} • Checklist Harian —{" "}
          {new Date(today + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {parts.length === 0 ? (
        <div className="bg-white dark:bg-[#1E293B] p-10 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm text-center">
          <p className="text-sm text-secondary italic">
            Belum ada daftar part checklist untuk aset ini. Hubungi administrator untuk menambahkannya di halaman Registrasi Aset.
          </p>
        </div>
      ) : sudahDiisi ? (
        <>
          <div className="bg-[#D1FAE5] dark:bg-[#115E59]/20 border border-[#0D9488]/30 rounded-2xl px-6 py-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-[#0D9488] flex-shrink-0" />
            <p className="text-sm font-bold text-[#065F46] dark:text-[#37BAAE]">
              Checklist hari ini sudah diisi oleh {existingChecklist.diisi_oleh_nama}.
            </p>
          </div>

          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
            {parts.map((part) => {
              const item = existingItems[part.id];
              const opt = KONDISI_OPTIONS.find((o) => o.value === item?.kondisi);
              return (
                <div key={part.id} className="flex flex-col gap-2 px-6 py-5 border-b border-gray-50 dark:border-[#334155] last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[15px]">{part.part_name}</span>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${opt?.activeClass || "bg-gray-100 border-gray-200 text-gray-500"}`}>
                      {opt?.label || "-"}
                    </span>
                  </div>
                  {item?.catatan && <p className="text-xs text-[#94A3B8] italic">Catatan: {item.catatan}</p>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
            {parts.map((part) => {
              const answer = answers[part.id];
              return (
                <div key={part.id} className="flex flex-col gap-3 px-6 py-5 border-b border-gray-50 dark:border-[#334155] last:border-0">
                  <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-[15px]">{part.part_name}</span>
                  <div className="flex gap-2">
                    {KONDISI_OPTIONS.map((opt) => {
                      const isActive = answer?.kondisi === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSetKondisi(part.id, opt.value)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                            isActive ? opt.activeClass : "bg-white dark:bg-[#0F172A] border-gray-200 dark:border-[#334155] text-[#94A3B8]"
                          }`}
                        >
                          {isActive ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={answer?.catatan || ""}
                    onChange={(e) => handleSetCatatan(part.id, e.target.value)}
                    placeholder="Catatan tambahan (opsional)"
                    className="px-4 py-2.5 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary bg-white dark:bg-[#0F172A] font-medium text-[#0F172A] dark:text-white"
                  />
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex items-center justify-between gap-4">
            <p className="text-xs text-[#94A3B8]">
              Diisi oleh: <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{user?.name || "-"}</span>
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || isSaving}
              className="px-6 py-3 bg-[#0D9488] text-white rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan..." : "Simpan Checklist"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}