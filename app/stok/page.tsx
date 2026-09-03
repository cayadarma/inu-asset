"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, ChevronDown, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
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
  created_at: string;
}

// --- HITUNG STATUS STOK BERDASARKAN QTY & AMBANG BATAS (min_stock) ---
const getStockStatus = (item: StockItem) => {
  if (item.qty <= 0) return "Habis";
  if (item.qty <= item.min_stock) return "Menipis";
  return "Tersedia";
};

export default function StockPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  // --- STATE FILTER ---
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  // --- STATE FORM TAMBAH ---
  const [addForm, setAddForm] = useState({
    id: "",
    name: "",
    category: "",
    qty: 0,
    unit: "Pcs",
    min_stock: 5,
    supplier_name: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE FORM EDIT ---
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    qty: 0,
    unit: "Pcs",
    min_stock: 5,
    supplier_name: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("stock_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setStockItems(data as StockItem[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- OPSI FILTER DINAMIS DARI DATA YANG ADA ---
  const categoryOptions = useMemo(
    () => Array.from(new Set(stockItems.map((i) => i.category).filter(Boolean))) as string[],
    [stockItems]
  );
  const supplierOptions = useMemo(
    () => Array.from(new Set(stockItems.map((i) => i.supplier_name).filter(Boolean))) as string[],
    [stockItems]
  );

  const filteredItems = stockItems.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q || item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
    const matchCategory = !categoryFilter || item.category === categoryFilter;
    const matchStatus = !statusFilter || getStockStatus(item) === statusFilter;
    const matchSupplier = !supplierFilter || item.supplier_name === supplierFilter;
    return matchQuery && matchCategory && matchStatus && matchSupplier;
  });

  // --- SUMMARY CARDS (DIHITUNG DARI DATA ASLI) ---
  const totalItems = stockItems.length;
  const lowStockCount = stockItems.filter((i) => getStockStatus(i) === "Menipis").length;
  const outOfStockCount = stockItems.filter((i) => getStockStatus(i) === "Habis").length;
  const totalSuppliers = supplierOptions.length;

  // --- TAMBAH ITEM STOK BARU ---
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      alert("Nama item wajib diisi.");
      return;
    }
    setIsSaving(true);

    const newId = addForm.id.trim() || `STK-${Date.now().toString().slice(-6)}`;

    const { error } = await supabase.from("stock_items").insert([{
      id: newId,
      name: addForm.name.trim(),
      category: addForm.category.trim() || null,
      qty: addForm.qty || 0,
      unit: addForm.unit || "Pcs",
      min_stock: addForm.min_stock || 5,
      supplier_name: addForm.supplier_name.trim() || null,
    }]);

    if (error) {
      alert("Gagal menyimpan item: " + error.message);
    } else {
      setIsAddModalOpen(false);
      setAddForm({ id: "", name: "", category: "", qty: 0, unit: "Pcs", min_stock: 5, supplier_name: "" });
      fetchData();
    }
    setIsSaving(false);
  };

  // --- BUKA MODAL EDIT ---
  const openEditModal = (item: StockItem) => {
    setSelectedItem(item);
    setEditForm({
      name: item.name,
      category: item.category || "",
      qty: item.qty,
      unit: item.unit,
      min_stock: item.min_stock,
      supplier_name: item.supplier_name || "",
    });
    setIsEditModalOpen(true);
  };

  // --- SIMPAN PERUBAHAN EDIT ---
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSaving(true);

    const { error } = await supabase.from("stock_items").update({
      name: editForm.name.trim(),
      category: editForm.category.trim() || null,
      qty: editForm.qty,
      unit: editForm.unit,
      min_stock: editForm.min_stock,
      supplier_name: editForm.supplier_name.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", selectedItem.id);

    if (error) {
      alert("Gagal menyimpan perubahan: " + error.message);
    } else {
      setIsEditModalOpen(false);
      setSelectedItem(null);
      fetchData();
    }
    setIsSaving(false);
  };

  // --- BUKA MODAL HAPUS ---
  const openDeleteModal = (item: StockItem) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  // --- HAPUS ITEM STOK (BESERTA RIWAYAT PERGERAKANNYA) ---
  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsSaving(true);

    await supabase.from("stock_movements").delete().eq("stock_item_id", selectedItem.id);
    const { error } = await supabase.from("stock_items").delete().eq("id", selectedItem.id);

    if (error) {
      alert("Gagal menghapus item: " + error.message);
    } else {
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      fetchData();
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left">
      {/* 1. HEADER */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Manajemen Stok</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Kelola inventaris suku cadang, pelumas, filter, dan material pemeliharaan</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-teal-700 shadow-sm transition-all active:scale-95"
        >
          <Plus size={18} /> Tambah Item
        </button>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Item Stok" val={String(totalItems)} desc="Jenis item terdaftar" color="text-[#0F172A] dark:text-[#F8FAFC]" />
        <StatCard label="Stok Menipis" val={String(lowStockCount)} desc="Butuh reorder segera" color="text-[#F59E0B]" />
        <StatCard label="Stok Habis" val={String(outOfStockCount)} desc="Stok kosong (0)" color="text-[#EF4444]" />
        <StatCard label="Total Supplier" val={String(totalSuppliers)} desc="Rekan pemasok aktif" color="text-[#10B981]" />
      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau kode item..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm outline-none focus:border-primary bg-white dark:bg-[#0F172A] dark:text-white"
          />
        </div>
        <FilterSelect label="Kategori" value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["Tersedia", "Menipis", "Habis"]} />
        <FilterSelect label="Supplier" value={supplierFilter} onChange={setSupplierFilter} options={supplierOptions} />
      </div>

      {/* 4. TABLE */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold">
              <tr>
                <th className="px-6 py-4 uppercase tracking-wider text-center">Kode</th>
                <th className="px-6 py-4 uppercase tracking-wider">Nama Item</th>
                <th className="px-6 py-4 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 uppercase tracking-wider">Stok Saat Ini</th>
                <th className="px-6 py-4 uppercase tracking-wider">Satuan</th>
                <th className="px-6 py-4 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-[#94A3B8] italic">Memuat data stok...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-[#94A3B8] italic">Belum ada item stok.</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-[#475569] dark:text-[#94A3B8] text-center">{item.id}</td>
                    <td className="px-6 py-5 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{item.name}</td>
                    <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] font-medium">{item.category || "-"}</td>
                    <td className={`px-6 py-5 font-black text-[14px] ${item.qty === 0 ? "text-red-600" : "text-[#0F172A] dark:text-[#F8FAFC]"}`}>{item.qty}</td>
                    <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] font-medium">{item.unit}</td>
                    <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8]">{item.supplier_name || "-"}</td>
                    <td className="px-6 py-5 text-center">
                      <Badge status={getStockStatus(item)} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-3">
                        <Link href={`/stok/${item.id}`} className="text-[#64748B] hover:text-[#0D9488] transition-colors"><Eye size={18} /></Link>
                        <button onClick={() => openEditModal(item)} className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => openDeleteModal(item)} className="text-[#64748B] hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL TAMBAH ITEM STOK */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Item Stok Baru">
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Kode Item</label>
            <input
              type="text"
              value={addForm.id}
              onChange={(e) => setAddForm({ ...addForm, id: e.target.value })}
              placeholder="Kosongkan untuk otomatis (STK-xxxxxx)"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Kategori</label>
            <input
              type="text"
              value={addForm.category}
              onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
              placeholder="Contoh: Filter, Pelumas, Elektrikal"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Nama Item / Nama Barang <span className="text-red-500">*</span></label>
            <input
              required
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="Masukkan nama barang lengkap"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Jumlah Stok Awal</label>
              <input
                type="number"
                min={0}
                value={addForm.qty}
                onChange={(e) => setAddForm({ ...addForm, qty: Number(e.target.value) })}
                placeholder="0"
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Satuan</label>
              <select
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary cursor-pointer font-medium dark:text-white"
              >
                <option>Pcs</option><option>Set</option><option>Can</option><option>Drum</option><option>Box</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Ambang Batas "Menipis"</label>
            <input
              type="number"
              min={0}
              value={addForm.min_stock}
              onChange={(e) => setAddForm({ ...addForm, min_stock: Number(e.target.value) })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Supplier Utama</label>
            <input
              type="text"
              value={addForm.supplier_name}
              onChange={(e) => setAddForm({ ...addForm, supplier_name: e.target.value })}
              placeholder="Nama perusahaan supplier"
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="md:col-span-2 flex gap-3 mt-4">
            <button type="button" disabled={isSaving} onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">Batalkan</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all disabled:opacity-50">
              {isSaving ? "Menyimpan..." : "Simpan Item"}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. MODAL EDIT ITEM STOK */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Item: ${selectedItem?.id || ""}`}>
        <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Nama Item</label>
            <input
              required
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm font-bold outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Kategori</label>
            <input
              type="text"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Satuan</label>
            <select
              value={editForm.unit}
              onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary cursor-pointer font-medium dark:text-white"
            >
              <option>Pcs</option><option>Set</option><option>Can</option><option>Drum</option><option>Box</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Update Stok (Saat Ini)</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={editForm.qty}
                onChange={(e) => setEditForm({ ...editForm, qty: Number(e.target.value) })}
                className="w-full p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F1F5F9] dark:bg-[#0F172A] text-sm font-black outline-none focus:border-primary text-[#0D9488]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">{editForm.unit}</span>
            </div>
            <span className="text-[11px] text-[#94A3B8] italic">Untuk mencatat riwayat masuk/keluar, gunakan tombol "Sesuaikan Stok" di halaman detail item.</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Ambang Batas "Menipis"</label>
            <input
              type="number"
              min={0}
              value={editForm.min_stock}
              onChange={(e) => setEditForm({ ...editForm, min_stock: Number(e.target.value) })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Supplier</label>
            <input
              type="text"
              value={editForm.supplier_name}
              onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
              className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm outline-none focus:border-primary dark:text-white"
            />
          </div>
          <div className="md:col-span-2 flex gap-3 mt-4">
            <button type="button" disabled={isSaving} onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">Batal</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-[#0D9488] text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition-all disabled:opacity-50">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. MODAL KONFIRMASI HAPUS */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus Item">
        <div className="flex flex-col gap-6 text-left">
          <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
            Yakin ingin menghapus item <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{selectedItem?.name}</span> ({selectedItem?.id})? Seluruh riwayat pergerakan stok item ini juga akan ikut terhapus secara permanen.
          </p>
          <div className="flex gap-3">
            <button type="button" disabled={isSaving} onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-[#334155] rounded-xl font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all disabled:opacity-50">Batal</button>
            <button type="button" disabled={isSaving} onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md transition-all disabled:opacity-50">
              {isSaving ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatCard({ label, val, desc, color }: any) {
  return (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1">
      <span className="text-[13px] text-[#94A3B8] font-medium tracking-tight">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{val}</span>
      <span className="text-[11px] text-[#94A3B8] mt-1 font-medium">{desc}</span>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none flex items-center gap-3 pl-4 pr-9 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] font-bold cursor-pointer hover:border-primary transition-all shadow-sm outline-none"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
    </div>
  );
}