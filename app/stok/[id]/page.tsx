"use client";

import React, { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Building2, User, Trash2, Pencil } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";

interface StockItem {
  id: string;
  name: string;
  category: string | null;
  qty: number;
  unit: string;
  min_stock: number;
  supplier_name: string | null;
  supplier_contact: string | null;
  supplier_address: string | null;
}

interface StockMovement {
  id: string;
  type: "Masuk" | "Keluar";
  qty: number;
  reference: string | null;
  note: string | null;
  created_at: string;
}

// --- HITUNG STATUS STOK (SAMA DENGAN HALAMAN DAFTAR STOK) ---
const getStockStatus = (item: StockItem) => {
  if (item.qty <= 0) return "Habis";
  if (item.qty <= item.min_stock) return "Menipis";
  return "Tersedia";
};

export default function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [item, setItem] = useState<StockItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- MODAL SESUAIKAN STOK ---
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ type: "Masuk", qty: 0, reference: "", note: "" });

  // --- MODAL EDIT INFO SUPPLIER ---
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ supplier_name: "", supplier_contact: "", supplier_address: "" });

  // --- MODAL HAPUS ITEM ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    const { data: itemData } = await supabase
      .from("stock_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { data: movementData } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("stock_item_id", id)
      .order("created_at", { ascending: false });

    if (itemData) {
      setItem(itemData as StockItem);
      setSupplierForm({
        supplier_name: itemData.supplier_name || "",
        supplier_contact: itemData.supplier_contact || "",
        supplier_address: itemData.supplier_address || "",
      });
    }
    if (movementData) setMovements(movementData as StockMovement[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (item?.name) document.title = `Stok — ${item.name}`;
  }, [item?.name]);

  const resetAdjustForm = () => setAdjustForm({ type: "Masuk", qty: 0, reference: "", note: "" });

  // --- SIMPAN PENYESUAIAN STOK (CATAT PERGERAKAN + UPDATE QTY) ---
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (!adjustForm.qty || adjustForm.qty <= 0) {
      alert("Jumlah wajib diisi dan lebih dari 0.");
      return;
    }
    if (adjustForm.type === "Keluar" && adjustForm.qty > item.qty) {
      alert(`Stok tidak mencukupi. Stok saat ini hanya ${item.qty} ${item.unit}.`);
      return;
    }

    setIsSaving(true);

    const { error: moveError } = await supabase.from("stock_movements").insert([{
      stock_item_id: item.id,
      type: adjustForm.type,
      qty: adjustForm.qty,
      reference: adjustForm.reference.trim() || null,
      note: adjustForm.note.trim() || null,
    }]);

    if (moveError) {
      alert("Gagal mencatat pergerakan stok: " + moveError.message);
      setIsSaving(false);
      return;
    }

    const newQty = adjustForm.type === "Masuk" ? item.qty + adjustForm.qty : item.qty - adjustForm.qty;

    const { error: updateError } = await supabase
      .from("stock_items")
      .update({ qty: newQty, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (updateError) {
      alert("Gagal memperbarui jumlah stok: " + updateError.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    setIsAdjustModalOpen(false);
    resetAdjustForm();
    fetchDetail();
  };

  // --- SIMPAN INFO SUPPLIER ---
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setIsSaving(true);

    const { error } = await supabase.from("stock_items").update({
      supplier_name: supplierForm.supplier_name.trim() || null,
      supplier_contact: supplierForm.supplier_contact.trim() || null,
      supplier_address: supplierForm.supplier_address.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);

    if (error) {
      alert("Gagal menyimpan info supplier: " + error.message);
    } else {
      setIsSupplierModalOpen(false);
      fetchDetail();
    }
    setIsSaving(false);
  };

  // --- HAPUS ITEM STOK DARI DATABASE ---
  const handleDeleteItem = async () => {
    if (!item) return;
    setIsDeleting(true);

    await supabase.from("stock_movements").delete().eq("stock_item_id", item.id);
    const { error } = await supabase.from("stock_items").delete().eq("id", item.id);

    if (error) {
      alert("Gagal menghapus item: " + error.message);
      setIsDeleting(false);
      return;
    }

    router.push("/stok");
  };

  if (isLoading) return <div className="p-20 text-center font-bold dark:text-white font-poppins">Memuat detail item stok...</div>;
  if (!item) return <div className="p-20 text-center text-red-500 font-bold font-poppins">Item stok tidak ditemukan.</div>;

  return (
    <div className="flex flex-col gap-6 pb-10 font-poppins text-left">
      {/* TOMBOL KEMBALI */}
      <Link
        href="/stok"
        className="flex items-center gap-2 text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:text-[#0D9488] transition-all w-fit group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Kembali ke Manajemen Stok
      </Link>

      {/* INFO CARD UTAMA */}
      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.name}</h2>
            <Badge status={getStockStatus(item)} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#64748B] dark:text-[#94A3B8]">
            <span>Kode: <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.id}</span></span>
            <span>Kategori: <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.category || "-"}</span></span>
            <span>Stok Saat Ini: <span className="font-bold text-[#0D9488]">{item.qty} {item.unit}</span></span>
          </div>
        </div>
        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="px-6 py-2.5 border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all shrink-0"
        >
          Sesuaikan Stok
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KIRI: RIWAYAT PERGERAKAN */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A]">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">Riwayat Pergerakan Stok</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white dark:bg-[#1E293B] border-b text-[#94A3B8] font-bold uppercase text-[11px]">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4">Jumlah</th>
                  <th className="px-6 py-4">Referensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#334155]">
                {movements.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-[#94A3B8] italic">Belum ada riwayat pergerakan stok.</td></tr>
                ) : (
                  movements.map((move) => (
                    <tr key={move.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                      <td className="px-6 py-4 font-medium text-[#475569] dark:text-[#94A3B8]">
                        {new Date(move.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${move.type === "Masuk" ? "bg-green-50 text-[#10B981]" : "bg-red-50 text-[#EF4444]"}`}>
                          {move.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-black ${move.type === "Masuk" ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {move.type === "Masuk" ? "+" : "-"}{move.qty} {item.unit}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#0D9488]">{move.reference || "-"}</p>
                        {move.note && <p className="text-[11px] text-[#94A3B8]">{move.note}</p>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* KANAN: INFO SUPPLIER */}
        <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg">Informasi Supplier</h3>
            <button onClick={() => setIsSupplierModalOpen(true)} className="text-[#64748B] hover:text-[#0D9488] transition-colors">
              <Pencil size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-[#94A3B8] font-bold uppercase">Nama Perusahaan</span>
              <span className="text-[15px] font-bold text-[#0D9488] flex items-center gap-2">
                <Building2 size={16} /> {item.supplier_name || "-"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-[#94A3B8] font-bold uppercase">Kontak Utama</span>
              <span className="text-[15px] font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
                <User size={16} /> {item.supplier_contact || "-"}
              </span>
            </div>
            <div className="pt-4 border-t border-gray-50 dark:border-[#334155]">
              <span className="text-[11px] text-[#94A3B8] font-bold uppercase">Alamat</span>
              <p className="text-sm text-[#475569] dark:text-[#94A3B8] mt-1 leading-relaxed italic">
                {item.supplier_address || "Belum ada alamat tercatat."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SESUAIKAN STOK */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => { setIsAdjustModalOpen(false); resetAdjustForm(); }} title="Sesuaikan Stok">
        <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-5 text-left">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Tipe Pergerakan</label>
            <select
              value={adjustForm.type}
              onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white"
            >
              <option value="Masuk">Masuk</option>
              <option value="Keluar">Keluar</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Jumlah ({item.unit}) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min={1}
              value={adjustForm.qty === 0 ? "" : adjustForm.qty}
              onChange={(e) => setAdjustForm({ ...adjustForm, qty: e.target.value === "" ? 0 : Number(e.target.value) })}
              placeholder="0"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white font-bold"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Referensi</label>
            <input
              type="text"
              value={adjustForm.reference}
              onChange={(e) => setAdjustForm({ ...adjustForm, reference: e.target.value })}
              placeholder="Contoh: WO-2024-0042 / PO-2024-0102"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Catatan</label>
            <textarea
              rows={2}
              value={adjustForm.note}
              onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
              placeholder="Keterangan tambahan (opsional)"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none bg-white dark:bg-[#0F172A] dark:text-white"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" disabled={isSaving} onClick={() => { setIsAdjustModalOpen(false); resetAdjustForm(); }} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">Batal</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all disabled:opacity-50">
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDIT INFO SUPPLIER */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Edit Informasi Supplier">
        <form onSubmit={handleSupplierSubmit} className="flex flex-col gap-5 text-left">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Nama Perusahaan</label>
            <input
              type="text"
              value={supplierForm.supplier_name}
              onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Kontak Utama</label>
            <input
              type="text"
              value={supplierForm.supplier_contact}
              onChange={(e) => setSupplierForm({ ...supplierForm, supplier_contact: e.target.value })}
              placeholder="Nama PIC / nomor telepon"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Alamat</label>
            <textarea
              rows={3}
              value={supplierForm.supplier_address}
              onChange={(e) => setSupplierForm({ ...supplierForm, supplier_address: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none bg-white dark:bg-[#0F172A] dark:text-white"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" disabled={isSaving} onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">Batal</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all disabled:opacity-50">
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI HAPUS ITEM */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus Item">
        <div className="flex flex-col gap-6 text-left">
          <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
            Yakin ingin menghapus item <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.name}</span> ({item.id}) beserta seluruh riwayat pergerakan stoknya secara permanen?
          </p>
          <div className="flex gap-3">
            <button type="button" disabled={isDeleting} onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">Batal</button>
            <button type="button" disabled={isDeleting} onClick={handleDeleteItem} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md transition-all disabled:opacity-50">
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>

      {/* HAPUS ITEM STOK (PALING BAWAH) */}
      <div className="bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-dashed border-red-200 dark:border-red-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-red-600 text-sm">Hapus Item Stok</h3>
          <p className="text-xs text-[#94A3B8]">Tindakan ini akan menghapus item beserta seluruh riwayat pergerakannya secara permanen dari database.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all active:scale-95 shrink-0"
        >
          <Trash2 size={16} /> Hapus Item Stok
        </button>
      </div>
    </div>
  );
}