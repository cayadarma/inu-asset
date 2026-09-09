"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, ChevronDown, Eye, Calendar, User, Briefcase, DollarSign, AlertCircle, Zap, Image as ImageIcon, Camera as CameraIcon } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";

function CorrectiveContent() {
  const searchParams = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEmergency, setIsSavingEmergency] = useState(false);

  // --- STATE DATA REAL ---
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);

  // --- STATE SEARCH & FILTER ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  
  // --- STATE FORM TAMBAH ---
  const [isNewCategory, setIsNewType] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    tgl: new Date().toISOString().split('T')[0],
    kategori: "Perbaikan",
    asset_id: "",
    trouble: "",
    jenis_barang: "", 
    pengawas: "", // Sekarang menampung teks bebas
    oleh: "",     // Sekarang menampung teks bebas
    priority: "TINGGI",
    costPart: 0,
    costService: 0,
    tindak_lanjut: ""
  });

  // --- STATE FORM PERBAIKAN MENDADAK (TANPA WORK ORDER FORMAL DI AWAL) ---
  const [emergencyForm, setEmergencyForm] = useState({
    asset_id: "",
    reporter_name: "",
    trouble: "",
    description: "",
    oleh: "",
    costPart: 0,
    costService: 0,
  });
  const [emergencyImageFile, setEmergencyImageFile] = useState<File | null>(null);
  const [emergencyImagePreview, setEmergencyImagePreview] = useState<string | null>(null);
  const emergencyFileInputRef = useRef<HTMLInputElement>(null);
  const emergencyCameraInputRef = useRef<HTMLInputElement>(null);

  const resetEmergencyForm = () => {
    setEmergencyForm({ asset_id: "", reporter_name: "", trouble: "", description: "", oleh: "", costPart: 0, costService: 0 });
    setEmergencyImageFile(null);
    setEmergencyImagePreview(null);
  };

  const handleEmergencyImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    setIsSavingEmergency(true);
    try {
      if (file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
        file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
      }
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1200, useWebWorker: true });
      setEmergencyImageFile(compressedFile);
      setEmergencyImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error("Gagal olah gambar:", error);
    } finally {
      setIsSavingEmergency(false);
    }
  };

  // --- SUBMIT PERBAIKAN MENDADAK: OTOMATIS BIKIN 2 RECORD (BUKU SAKIT + WORK ORDER) ---
  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyForm.asset_id) return alert("Pilih aset terlebih dahulu!");
    if (!emergencyForm.trouble.trim()) return alert("Kejadian/masalah wajib diisi!");

    setIsSavingEmergency(true);
    try {
      let finalImageUrl = "";
      if (emergencyImageFile) {
        const fileName = `${Date.now()}-emergency-${emergencyForm.asset_id}`;
        const { error: uploadError } = await supabase.storage.from("asset-images").upload(fileName, emergencyImageFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("asset-images").getPublicUrl(fileName);
          finalImageUrl = publicUrl;
        }
      }

      // 1. Catat otomatis ke Buku Sakit
      const { error: reportError } = await supabase.from("damage_reports").insert([{
        asset_id: emergencyForm.asset_id,
        reporter_name: emergencyForm.reporter_name || emergencyForm.oleh || "Operator",
        issue_title: emergencyForm.trouble,
        description: emergencyForm.description,
        urgency: "Tinggi",
        image_url: finalImageUrl,
      }]);
      if (reportError) throw reportError;

      // 2. Buat Work Order dengan flag is_emergency (status aset langsung "Perbaikan", tanpa menunggu proses)
      const woId = `WO-EMG-${Date.now().toString().slice(-6)}`;
      const { error: woError } = await supabase.from("work_orders").insert([{
        id: woId,
        tgl: new Date().toISOString().split('T')[0],
        kategori: "Perbaikan",
        asset_id: emergencyForm.asset_id,
        trouble: emergencyForm.trouble,
        tech_name: emergencyForm.oleh,
        supervisor: "",
        priority: "TINGGI",
        cost_part: emergencyForm.costPart,
        cost_service: emergencyForm.costService,
        tindak_lanjut: emergencyForm.description,
        status: "Dalam Proses",
        is_emergency: true,
      }]);
      if (woError) throw woError;

      // 3. Aset langsung berstatus "Perbaikan" saat itu juga, dari status apa pun sebelumnya
      await supabase.from("assets").update({ status: "Perbaikan" }).eq("id", emergencyForm.asset_id);

      alert("Perbaikan mendadak berhasil dicatat!");
      setIsEmergencyModalOpen(false);
      resetEmergencyForm();
      fetchData();
    } catch (err: any) {
      alert("Gagal: " + (err?.message || "Terjadi kesalahan"));
    } finally {
      setIsSavingEmergency(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const { data: woData } = await supabase.from("work_orders").select(`*, assets(name, type, location_id, locations(name))`).order("created_at", { ascending: false });
    const { data: assetData } = await supabase.from("assets").select("id, name, type");
    const { data: locationData } = await supabase.from("locations").select("id, name").order("name", { ascending: true });

    if (woData) setWorkOrders(woData);
    if (assetData) setAssetsList(assetData);
    if (locationData) setLocationsList(locationData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    if (searchParams.get("openModal") === "true") {
      setIsAddModalOpen(true);
      setFormData(prev => ({ 
        ...prev, 
        asset_id: searchParams.get("assetId") || "", 
        trouble: searchParams.get("problem") || "",
        id: `WO-${Date.now().toString().slice(-4)}`
      }));
    }
  }, [searchParams]);

  // Auto fill Jenis Barang berdasarkan pilihan Kode Aset
  useEffect(() => {
    const selectedAsset = assetsList.find(a => a.id === formData.asset_id);
    if (selectedAsset) {
      setFormData(prev => ({ ...prev, jenis_barang: selectedAsset.type || "Tidak diketahui" }));
    }
  }, [formData.asset_id, assetsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await supabase.from("work_orders").insert([{
      id: formData.id || `WO-${Date.now().toString().slice(-4)}`,
      tgl: formData.tgl,
      kategori: formData.kategori,
      asset_id: formData.asset_id,
      trouble: formData.trouble,
      tech_name: formData.oleh,
      supervisor: formData.pengawas,
      priority: formData.priority,
      cost_part: formData.costPart,
      cost_service: formData.costService,
      tindak_lanjut: formData.tindak_lanjut,
      status: "Dalam Proses"
    }]);

    if (!error) {
      await supabase.from("assets").update({ status: "Perbaikan" }).eq("id", formData.asset_id);
      setIsAddModalOpen(false);
      fetchData();
    } else {
      alert(error.message);
    }
    setIsLoading(false);
  };

  // --- FILTER WORK ORDER SESUAI SEARCH, STATUS, DAN LOKASI ---
  const filteredWorkOrders = workOrders.filter((wo) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      wo.id?.toLowerCase().includes(q) ||
      wo.trouble?.toLowerCase().includes(q) ||
      wo.assets?.name?.toLowerCase().includes(q) ||
      wo.tech_name?.toLowerCase().includes(q);

    const matchesStatus = !statusFilter || wo.status === statusFilter;
    const matchesLocation = !locationFilter || wo.assets?.location_id === locationFilter;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins text-left transition-colors duration-300">
      {/* 1. HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Pemeliharaan Korektif</h1>
          <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">Kelola tiket perbaikan dan Work Order aset secara reaktif</p>
        </div>
        <div className="flex bg-[#E2E8F0] dark:bg-[#334155] p-1 rounded-xl">
          <Link href="/pemeliharaan" className="px-6 py-2 rounded-lg text-sm font-medium text-[#475569] dark:text-[#94A3B8]">Pemeliharaan Pencegahan</Link>
          <button className="px-6 py-2 bg-white dark:bg-[#1E293B] rounded-lg text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] shadow-sm">Pemeliharaan Korektif</button>
        </div>
      </div>

      {/* 2. SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatItem label="Total WO" val={workOrders.length} color="text-[#0F172A] dark:text-[#F8FAFC]" />
        <StatItem label="Dalam Proses" val={workOrders.filter(w => w.status === 'Dalam Proses').length} color="text-[#3B82F6]" />
        <StatItem label="Suku Cadang" val={workOrders.filter(w => w.status === 'Menunggu Part').length} color="text-[#F59E0B]" />
        <StatItem label="Selesai" val={workOrders.filter(w => w.status === 'Selesai').length} color="text-[#10B981]" />
      </div>

      {/* 3. FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:flex-1">
          {/* SEARCH: di mobile berada di atas, di desktop sejajar dengan filter lain */}
          <div className="relative w-full md:flex-1 md:max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input
              type="text"
              placeholder="Cari No. WO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-[#334155] rounded-lg text-sm outline-none focus:border-primary bg-white dark:bg-[#1E293B] dark:text-white"
            />
          </div>
          {/* DROPDOWN STATUS & LOKASI: di mobile sejajar satu sama lain, di desktop sejajar dengan search */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "Dalam Proses", label: "Dalam Proses" },
                { value: "Menunggu Part", label: "Menunggu Suku Cadang" },
                { value: "Selesai", label: "Selesai" },
              ]}
              className="flex-1 md:flex-none"
            />
            <FilterSelect
              label="Lokasi"
              value={locationFilter}
              onChange={setLocationFilter}
              options={locationsList.map((l) => ({ value: l.id, label: l.name }))}
              className="flex-1 md:flex-none"
            />
          </div>
        </div>
        {/* TOMBOL TAMBAH WORK ORDER & PERBAIKAN MENDADAK */}
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => setIsEmergencyModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#EF4444] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-all">
            <Zap size={18} /> Perbaikan Mendadak
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#0D9488] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-all">
            <Plus size={18} /> Buat Work Order
          </button>
        </div>
      </div>

      {/* 4. TABEL */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="p-10 text-center text-[#94A3B8] italic">Memproses data...</p>
          ) : workOrders.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <AlertCircle size={48} className="text-gray-200 dark:text-gray-700" />
               <p className="text-[#94A3B8] font-bold">Belum ada work order aktif.</p>
            </div>
          ) : filteredWorkOrders.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <AlertCircle size={48} className="text-gray-200 dark:text-gray-700" />
               <p className="text-[#94A3B8] font-bold">Tidak ada work order yang sesuai dengan pencarian/filter.</p>
            </div>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F172A]/50 border-b text-[#475569] dark:text-[#94A3B8] font-bold">
                <tr>
                  <th className="px-6 py-4 uppercase">No. WO</th>
                  <th className="px-6 py-4 uppercase">Aset & Lokasi</th>
                  <th className="px-6 py-4 uppercase">Trouble</th>
                  <th className="px-6 py-4 uppercase">Pelaksana</th>
                  <th className="px-6 py-4 text-center uppercase">Status</th>
                  <th className="px-6 py-4 text-center uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
                {filteredWorkOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50/50 dark:hover:bg-[#0F172A]/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-[#0F172A] dark:text-[#F8FAFC]">{wo.id}</td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">{wo.assets?.name}</p>
                      <p className="text-[11px] text-[#94A3B8] uppercase font-bold">{wo.assets?.locations?.name}</p>
                    </td>
                    <td className="px-6 py-5 text-[#475569] dark:text-[#94A3B8] italic truncate max-w-[200px]">"{wo.trouble}"</td>
                    <td className="px-6 py-5 text-[#475569] dark:text-[#F8FAFC] font-bold">{wo.tech_name}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge status={wo.status} />
                        {wo.is_emergency && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#EF4444] uppercase tracking-wide">
                            <Zap size={10} /> Mendadak
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <Link href={`/pemeliharaan/korektif/${wo.id}`} className="p-2 inline-block text-[#64748B] hover:text-[#0D9488] transition-all"><Eye size={20}/></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. MODAL PENERBITAN WO */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Penerbitan Work Order">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Kode Aset (KODE)</label>
                <select required value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white">
                  <option value="">-- Pilih Kode --</option>
                  {assetsList.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Tanggal Terbit (TGL)</label>
                <input type="date" value={formData.tgl} onChange={e => setFormData({...formData, tgl: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Kategori</label>
                <select value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none dark:text-white">
                    <option>Perbaikan</option><option>Ganti Aset</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Jenis Barang (Auto)</label>
                <input type="text" value={formData.jenis_barang} disabled className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-sm text-[#94A3B8] font-black cursor-not-allowed" placeholder="Otomatis terisi..." />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Masalah (TROUBLE)</label>
              <input required type="text" value={formData.trouble} onChange={e => setFormData({...formData, trouble: e.target.value})} placeholder="Ketik masalah yang ditemukan..." className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Tindakan Perbaikan (TINDAK LANJUT)</label>
              <textarea rows={3} value={formData.tindak_lanjut} onChange={e => setFormData({...formData, tindak_lanjut: e.target.value})} placeholder="Apa tindakan yang harus dilakukan?" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none bg-white dark:bg-[#0F172A] dark:text-white font-medium"></textarea>
            </div>

            {/* BAGIAN PENGAWAS & PELAKSANA (SEKARANG KETIK MANUAL SESUAI PERMINTAAN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Pengawas (PENGAWAS)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Ariawan, Sujana" 
                    value={formData.pengawas}
                    onChange={e => setFormData({...formData, pengawas: e.target.value})}
                    className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white" 
                  />
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-sm text-[#0F172A] dark:text-white uppercase tracking-wider">Pelaksana (OLEH)</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Veri Guna, Yan Adi Guna" 
                    value={formData.oleh}
                    onChange={e => setFormData({...formData, oleh: e.target.value})}
                    className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white" 
                  />
               </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-6 bg-[#F8FAFC] dark:bg-[#0F172A] p-6 rounded-2xl border border-gray-100 dark:border-[#334155]">
            <h4 className="font-bold text-[#0F172A] dark:text-white text-sm border-b dark:border-[#334155] pb-2 uppercase tracking-widest text-center">Eksekusi & Biaya</h4>
            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Prioritas</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="p-2.5 border dark:border-[#334155] rounded-lg text-sm dark:bg-[#1E293B] dark:text-white font-black outline-none">
                    <option>TINGGI</option><option>SEDANG</option><option>RENDAH</option>
                  </select>
               </div>

               {/* Biaya Part (Angka 0 otomatis hilang saat diketik) */}
               <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Biaya Part (Rp)</label>
                  <input type="number" value={formData.costPart === 0 ? "" : formData.costPart} onChange={e => setFormData({...formData, costPart: e.target.value === "" ? 0 : parseInt(e.target.value)})} placeholder="0" className="p-2.5 border dark:border-[#334155] rounded-lg text-sm dark:bg-[#1E293B] dark:text-white font-bold outline-none focus:border-primary" />
               </div>

               {/* Biaya Jasa (Angka 0 otomatis hilang saat diketik) */}
               <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Biaya Jasa (Rp)</label>
                  <input type="number" value={formData.costService === 0 ? "" : formData.costService} onChange={e => setFormData({...formData, costService: e.target.value === "" ? 0 : parseInt(e.target.value)})} placeholder="0" className="p-2.5 border dark:border-[#334155] rounded-lg text-sm dark:bg-[#1E293B] dark:text-white font-bold outline-none focus:border-primary" />
               </div>

               {/* Total Biaya Otomatis */}
               <div className="mt-2 p-4 bg-white dark:bg-[#1E293B] rounded-2xl border border-dashed border-[#0D9488]/30 flex justify-between items-center shadow-sm">
                  <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-tighter">Total Estimasi</span>
                  <span className="text-sm font-black text-[#0D9488]">
                    Rp {(formData.costPart + formData.costService).toLocaleString('id-ID')}
                  </span>
               </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-auto pt-6">
              <button type="submit" className="w-full bg-[#0D9488] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-teal-700 transition-all active:scale-95">Terbitkan Work Order</button>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full py-4 border border-gray-200 dark:border-[#334155] rounded-xl text-[#475569] dark:text-[#94A3B8] text-sm font-bold hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">Batalkan</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 6. MODAL PERBAIKAN MENDADAK */}
      <Modal isOpen={isEmergencyModalOpen} onClose={() => { setIsEmergencyModalOpen(false); resetEmergencyForm(); }} title="Catat Perbaikan Mendadak">
        <form onSubmit={handleEmergencySubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              Untuk kejadian mendadak yang butuh penanganan cepat (contoh: kebocoran pipa). Aset langsung berstatus "Perbaikan" saat ini juga, dan otomatis tercatat di Buku Sakit — tanpa perlu lapor kerusakan terpisah dulu.
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Kode Aset</label>
              <select required value={emergencyForm.asset_id} onChange={e => setEmergencyForm({...emergencyForm, asset_id: e.target.value})} className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white">
                <option value="">-- Pilih Kode --</option>
                {assetsList.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
              </select>
              <span className="text-[11px] text-[#94A3B8] italic">Bisa dipilih dari status aset apa pun, tidak harus "Rusak" dulu.</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Kejadian / Masalah</label>
              <input required type="text" value={emergencyForm.trouble} onChange={e => setEmergencyForm({...emergencyForm, trouble: e.target.value})} placeholder="Contoh: Pipa bocor di area produksi" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:border-primary dark:bg-[#0F172A] dark:text-white" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Penanganan Awal / Catatan</label>
              <textarea rows={3} value={emergencyForm.description} onChange={e => setEmergencyForm({...emergencyForm, description: e.target.value})} placeholder="Jelaskan penanganan yang sudah/akan dilakukan..." className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl text-sm outline-none bg-white dark:bg-[#0F172A] dark:text-white font-medium"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Yang Menemukan/Melapor</label>
                <input type="text" value={emergencyForm.reporter_name} onChange={e => setEmergencyForm({...emergencyForm, reporter_name: e.target.value})} placeholder="Nama pelapor" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Pelaksana Perbaikan</label>
                <input type="text" value={emergencyForm.oleh} onChange={e => setEmergencyForm({...emergencyForm, oleh: e.target.value})} placeholder="Nama teknisi/operator" className="p-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm outline-none focus:border-primary dark:text-white" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">Foto Kejadian</label>
              <input type="file" className="hidden" ref={emergencyFileInputRef} onChange={handleEmergencyImageChange} accept="image/*,.heic" />
              <input type="file" className="hidden" ref={emergencyCameraInputRef} onChange={handleEmergencyImageChange} accept="image/*" capture="environment" />
              <div className="flex items-center gap-3">
                {emergencyImagePreview && (
                  <img src={emergencyImagePreview} className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-[#334155]" alt="Preview" />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => emergencyFileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-[#F1F5F9] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-200 dark:hover:bg-[#334155] transition-all">
                    <ImageIcon size={16} /> Pilih dari Galeri
                  </button>
                  <button type="button" onClick={() => emergencyCameraInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-[#F1F5F9] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-xl text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:bg-gray-200 dark:hover:bg-[#334155] transition-all">
                    <CameraIcon size={16} /> Kamera
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-6 bg-[#F8FAFC] dark:bg-[#0F172A] p-6 rounded-2xl border border-gray-100 dark:border-[#334155]">
            <h4 className="font-bold text-[#0F172A] dark:text-white text-sm border-b dark:border-[#334155] pb-2 uppercase tracking-widest text-center">Estimasi Biaya (Opsional)</h4>
            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Biaya Part (Rp)</label>
                  <input type="number" value={emergencyForm.costPart === 0 ? "" : emergencyForm.costPart} onChange={e => setEmergencyForm({...emergencyForm, costPart: e.target.value === "" ? 0 : parseInt(e.target.value)})} placeholder="0" className="p-2.5 border dark:border-[#334155] rounded-lg text-sm dark:bg-[#1E293B] dark:text-white font-bold outline-none focus:border-primary" />
               </div>
               <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#94A3B8] uppercase">Biaya Jasa (Rp)</label>
                  <input type="number" value={emergencyForm.costService === 0 ? "" : emergencyForm.costService} onChange={e => setEmergencyForm({...emergencyForm, costService: e.target.value === "" ? 0 : parseInt(e.target.value)})} placeholder="0" className="p-2.5 border dark:border-[#334155] rounded-lg text-sm dark:bg-[#1E293B] dark:text-white font-bold outline-none focus:border-primary" />
               </div>
               <div className="mt-2 p-4 bg-white dark:bg-[#1E293B] rounded-2xl border border-dashed border-red-400/40 flex justify-between items-center shadow-sm">
                  <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-tighter">Total Estimasi</span>
                  <span className="text-sm font-black text-[#EF4444]">
                    Rp {(emergencyForm.costPart + emergencyForm.costService).toLocaleString('id-ID')}
                  </span>
               </div>
               <p className="text-[10px] text-[#94A3B8] italic -mt-2">Biaya final bisa diperbarui lagi lewat riwayat update perbaikan, sama seperti Work Order biasa.</p>
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-6">
              <button type="submit" disabled={isSavingEmergency} className="w-full bg-[#EF4444] text-white py-4 rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50">
                {isSavingEmergency ? "Menyimpan..." : "Catat & Mulai Perbaikan"}
              </button>
              <button type="button" onClick={() => { setIsEmergencyModalOpen(false); resetEmergencyForm(); }} className="w-full py-4 border border-gray-200 dark:border-[#334155] rounded-xl text-[#475569] dark:text-[#94A3B8] text-sm font-bold hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-all">Batalkan</button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// WRAPPER UTAMA
export default function CorrectiveMaintenancePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold dark:text-white">Memuat...</div>}>
      <CorrectiveContent />
    </Suspense>
  );
}

function StatItem({ label, val, color }: any) {
  return (
    <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-1 transition-all duration-300">
      <span className="text-[13px] text-[#94A3B8] font-medium tracking-tight uppercase">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{val}</span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`relative flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-lg text-sm text-[#475569] dark:text-[#94A3B8] font-bold cursor-pointer hover:border-primary transition-all shadow-sm ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent outline-none pr-6 cursor-pointer text-[#475569] dark:text-[#94A3B8] font-bold"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3" />
    </div>
  );
}