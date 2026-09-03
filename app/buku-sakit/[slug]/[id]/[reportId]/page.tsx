"use client";

import React, { useState, use, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeft, 
  Calendar, 
  User, 
  Image as ImageIcon, 
  Box, 
  X, 
  ArrowRight, 
  Info 
} from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { useSearchParams } from "next/navigation";

export default function FinalReportDetailPage({ params }: { params: Promise<{ slug: string, id: string, reportId: string }> }) {
  // Ambil ketiga ID dari URL
  const { slug, id, reportId } = use(params);
  const searchParams = useSearchParams();
  
  // State Data
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Tangkap nama lokasi untuk kebutuhan tombol kembali
  const locName = searchParams.get("name") || "";

  useEffect(() => {
    async function fetchSingleReport() {
      setIsLoading(true);
      // Ambil detail laporan beserta info aset dan lokasinya secara mendalam
      const { data } = await supabase
        .from("damage_reports")
        .select(`*, assets (*, locations (name))`)
        .eq("id", reportId)
        .maybeSingle();

      if (data) setReport(data);
      setIsLoading(false);
    }
    fetchSingleReport();
  }, [reportId]);

  if (isLoading) return <div className="p-20 text-center font-bold dark:text-white font-poppins">Memuat detail laporan...</div>;
  if (!report) return <div className="p-20 text-center text-red-500 font-bold">Laporan tidak ditemukan.</div>;

  // Variabel Warna Senada (Seamless) agar box kiri dan kanan sama
  const innerBoxStyle = "bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155]";

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto pb-10 font-poppins text-left">
      
      {/* 1. TOMBOL KEMBALI KE RIWAYAT ASET (Sesuai Navigasi Anda) */}
      <Link 
        href={`/buku-sakit/${slug}/${id}?name=${encodeURIComponent(locName)}&assetName=${encodeURIComponent(searchParams.get("assetName") || "")}`} 
        className="flex items-center gap-2 text-sm font-bold text-[#475569] dark:text-[#94A3B8] hover:text-[#0D9488] transition-all w-fit group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
        Kembali ke Riwayat Aset
      </Link>

      <div className="bg-white dark:bg-[#1E293B] rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* 2. HEADER SECTION (Senada) */}
        <div className="p-8 md:p-10 border-b border-gray-50 dark:border-[#334155] flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-[#EF4444]/10 text-[#EF4444] text-[10px] font-black rounded-full uppercase tracking-tighter border border-[#EF4444]/20">
                Laporan Kerusakan
              </span>
              <Badge status={report.urgency || "Sedang"} />
            </div>
            <h1 className="text-3xl font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mt-1 capitalize leading-tight">
              {report.issue_title}
            </h1>
          </div>
          <div className={`${innerBoxStyle} px-5 py-3 rounded-2xl shadow-sm text-right min-w-[140px]`}>
             <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest leading-none mb-1">ID Laporan</p>
             <p className="text-sm font-mono font-bold text-[#475569] dark:text-[#F8FAFC]">#{reportId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* 3. CONTENT GRID (Seamless) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          
          {/* SISI KIRI: DATA & INFORMASI */}
          <div className="p-8 md:p-10 flex flex-col gap-10 bg-white dark:bg-[#1E293B]">
            
            {/* Box Info Aset */}
            <div className="flex flex-col gap-4">
               <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] flex items-center gap-2">
                 <Box size={14} className="text-[#0D9488]"/> Informasi Aset
               </h3>
               <div className={`p-6 rounded-[24px] shadow-sm ${innerBoxStyle}`}>
                  <p className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{report.assets?.name}</p>
                  <div className="flex items-center gap-3 text-sm text-[#475569] dark:text-[#94A3B8] mt-2 font-medium">
                     <span className="bg-[#CCFBF1] dark:bg-[#115E59]/40 text-[#0D9488] dark:text-[#37BAAE] px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider">{report.assets?.type}</span>
                     <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                     <span className="uppercase tracking-widest text-[12px] font-bold text-[#475569] dark:text-[#94A3B8]">{report.assets?.locations?.name}</span>
                  </div>
               </div>
            </div>

            {/* Row Pelapor & Tanggal */}
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Pelapor</span>
                <div className="flex items-center gap-3 text-[#0F172A] dark:text-[#F8FAFC] font-bold">
                  <div className="p-2.5 bg-[#F1F5F9] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] rounded-xl text-[#0D9488] shadow-sm"><User size={18} /></div>
                  <span className="text-[16px]">{report.reporter_name}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Waktu</span>
                <div className="flex items-center gap-3 text-[#0F172A] dark:text-[#F8FAFC] font-bold">
                  <div className="p-2.5 bg-[#F1F5F9] dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] rounded-xl text-[#0D9488] shadow-sm"><Calendar size={18} /></div>
                  <span className="text-[16px]">{new Date(report.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
            </div>

            {/* Kronologi Masalah */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">Kronologi Masalah</span>
              <div className={`p-6 rounded-[24px] leading-relaxed shadow-sm ${innerBoxStyle}`}>
                <p className="text-[15px] text-[#475569] dark:text-[#F8FAFC]">
                  {report.description || "Tidak ada deskripsi tambahan."}
                </p>
              </div>
            </div>
          </div>

          {/* SISI KANAN: FOTO BUKTI (4:3) */}
          <div className="p-8 md:p-10 bg-white dark:bg-[#1E293B]">
            <h3 className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ImageIcon size={14} className="text-[#0D9488]"/> Foto Bukti Kerusakan
            </h3>
            <div 
              className="w-full aspect-[4/3] rounded-[32px] overflow-hidden border-4 border-white dark:border-[#0F172A] shadow-2xl cursor-zoom-in relative group transition-all duration-500 hover:scale-[1.01]"
              onClick={() => report.image_url && setIsLightboxOpen(true)}
            >
              <img 
                src={report.image_url || "https://placehold.co/800x600?text=No+Photo"} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                alt="" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                 <span className="bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-xs font-bold border border-white/30 shadow-xl">Resolusi Penuh</span>
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 p-4 bg-[#F8FAFC] dark:bg-[#0F172A] rounded-2xl border border-gray-100 dark:border-white/5">
                <Info size={16} className="text-[#94A3B8] mt-0.5" />
                <p className="text-[11px] text-[#94A3B8] font-medium leading-relaxed italic">
                   Gunakan lampiran visual ini sebagai referensi teknis perbaikan.
                </p>
            </div>
          </div>
        </div>

        {/* 4. FOOTER ACTION */}
        <div className="p-8 md:p-10 border-t border-gray-100 dark:border-[#334155] bg-white dark:bg-[#1E293B] flex justify-end">
            <Link href={`/pemeliharaan/korektif?openModal=true&assetId=${report.asset_id}&assetName=${encodeURIComponent(report.assets?.name)}&problem=${encodeURIComponent(report.issue_title)}`}
            className="group flex items-center gap-4 px-10 py-4 bg-[#0D9488] text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-teal-700 active:scale-95 transition-all">
            Terbitkan Work Order <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
      </div>

      {/* 5. LIGHTBOX LAYAR PENUH */}
      {isLightboxOpen && report.image_url && (
        <div 
          className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img 
            src={report.image_url} 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in duration-300 border-4 border-white/10" 
            alt="Resolusi Penuh" 
          />
          <button className="absolute top-8 right-8 text-white p-3 hover:bg-white/10 rounded-full transition-all border border-white/20">
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
}