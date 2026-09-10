"use client";

import React, { useEffect, useState } from "react";
import { Wallet, Save, Pencil, ChevronDown, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface BudgetRow {
  id: string;
  year: number;
  month: number;
  amount: number;
  updated_at: string;
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// --- FORMAT ANGKA JADI FORMAT RIBUAN ID (TITIK SEBAGAI PEMISAH) SAAT USER MENGETIK ---
const formatRibuan = (value: string) => {
  if (!value) return "";
  const numeric = value.replace(/\D/g, "");
  if (!numeric) return "";
  return Number(numeric).toLocaleString("id-ID");
};
const parseRibuan = (value: string) => Number(value.replace(/\D/g, "")) || 0;

export default function AnggaranPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  const now = new Date();
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    amount: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBudgets = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("company_budgets")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    setBudgets(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const currentMonthBudget = budgets.find(b => b.year === now.getFullYear() && b.month === now.getMonth() + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return alert("Isi nominal anggaran terlebih dahulu!");
    setIsSaving(true);

    // Upsert berdasarkan kombinasi unik year + month
    const { error } = await supabase.from("company_budgets").upsert(
      [{ year: form.year, month: form.month, amount: Number(form.amount), updated_at: new Date().toISOString() }],
      { onConflict: "year,month" }
    );

    if (error) {
      alert("Gagal menyimpan: " + error.message);
    } else {
      setForm({ year: now.getFullYear(), month: now.getMonth() + 1, amount: "" });
      setEditingId(null);
      fetchBudgets();
    }
    setIsSaving(false);
  };

  const handleEditClick = (b: BudgetRow) => {
    setEditingId(b.id);
    setForm({ year: b.year, month: b.month, amount: String(b.amount) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Anggaran Perusahaan</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Atur anggaran bulanan untuk memantau serapan biaya di Dashboard</p>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium flex items-start gap-2">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        Anggaran diinput manual per bulan oleh admin. Nantinya kalau sistem role management sudah aktif, halaman ini akan dibatasi khusus untuk role administrator.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM INPUT ANGGARAN */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm h-fit">
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base mb-5">
            {editingId ? "Edit Anggaran" : "Set Anggaran Bulan"}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Bulan</label>
                <div className="relative">
                  <select
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white"
                  >
                    {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Tahun</label>
                <div className="relative">
                  <select
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white"
                  >
                    {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Nominal Anggaran (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatRibuan(form.amount)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, amount: digits });
                }}
                placeholder="Contoh: 50.000.000"
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-sm font-bold outline-none focus:border-primary dark:text-white"
              />
              <span className="text-[11px] text-[#94A3B8] italic">
                Kalau bulan & tahun ini sudah pernah diisi, menyimpan lagi akan menimpa (update) nilai sebelumnya.
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan Anggaran"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm({ year: now.getFullYear(), month: now.getMonth() + 1, amount: "" }); }}
                  className="px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          {currentMonthBudget && (
            <div className="mt-6 p-4 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl border border-gray-100 dark:border-[#334155]">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Anggaran Bulan Ini ({BULAN[now.getMonth()]} {now.getFullYear()})</p>
              <p className="text-xl font-bold text-[#0D9488]">{formatRupiah(currentMonthBudget.amount)}</p>
            </div>
          )}
        </div>

        {/* TABEL RIWAYAT ANGGARAN */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-[#334155]">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base">Riwayat Anggaran</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold">
                <tr>
                  <th className="px-6 py-4">Periode</th>
                  <th className="px-6 py-4 text-right">Nominal Anggaran</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {isLoading ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
                ) : budgets.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-[#94A3B8] italic">Belum ada anggaran yang diinput.</td></tr>
                ) : (
                  budgets.map((b) => {
                    const isCurrent = b.year === now.getFullYear() && b.month === now.getMonth() + 1;
                    return (
                      <tr key={b.id} className={`hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-colors ${isCurrent ? "bg-teal-50/50 dark:bg-teal-950/10" : ""}`}>
                        <td className="px-6 py-4 font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          {BULAN[b.month - 1]} {b.year}
                          {isCurrent && <span className="ml-2 text-[10px] font-black text-[#0D9488] bg-[#CCFBF1] dark:bg-[#115E59]/30 px-2 py-0.5 rounded-full uppercase">Bulan Ini</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-[#0D9488]">{formatRupiah(b.amount)}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => handleEditClick(b)} className="p-2 text-[#94A3B8] hover:text-[#0D9488] hover:bg-gray-100 dark:hover:bg-[#334155] rounded-lg transition-all">
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}