"use client"; // Wajib agar tombol bisa diklik

import React, { useState } from "react";
import { Download, Eye, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function ReportPage() {
  // 1. State untuk menyimpan pilihan User (Demonstrasi)
  const [reportType, setReportType] = useState("Pemeliharaan Report");
  const [location, setLocation] = useState("Power Plant");
  const [period, setPeriod] = useState("Juni 2024");
  const [format, setFormat] = useState("pdf"); // 'pdf' atau 'excel'

  const recentReports = [
    { name: "Laporan_Pemeliharaan_PowerPlant_Juni2024", type: "Pemeliharaan", date: "30 Jun 2024", format: "PDF", color: "bg-[#FEE2E2] text-[#EF4444]" },
    { name: "Ikhtisar_Biaya_Aset_Q2_2024", type: "Analisis Biaya", date: "28 Jun 2024", format: "EXCEL", color: "bg-[#D1FAE5] text-[#065F46]" },
    { name: "Daftar_Stok_Suku_Cadang_Juni", type: "Stok", date: "25 Jun 2024", format: "EXCEL", color: "bg-[#D1FAE5] text-[#065F46]" },
    { name: "Laporan_BukuSakit_PompaAir_Mei", type: "Buku Sakit", date: "15 Jun 2024", format: "PDF", color: "bg-[#FEE2E2] text-[#EF4444]" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10 font-poppins">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Laporan</h1>
        <p className="text-[#475569] dark:text-[#94A3B8] text-sm">Hasilkan laporan komprehensif aset and pemeliharaan secara instan</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
        
        {/* KIRI: Konfigurasi Ekspor Laporan */}
        <div className="xl:col-span-2 bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-8">
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]text-lg">Konfigurasi Ekspor Laporan</h3>
          
          <div className="flex flex-col gap-6">
            {/* Dropdown Tipe Laporan */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">Tipe Laporan</label>
              <div className="relative">
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] text-sm text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option>Pemeliharaan Report</option>
                  <option>Asset Inventory Report</option>
                  <option>Buku Sakit Report</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Dropdown Lokasi */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">Lokasi</label>
              <div className="relative">
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option>Power Plant</option>
                  <option>Lagoon</option>
                  <option>LPS 1</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Dropdown Periode */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">Periode</label>
              <div className="relative">
                <select 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full appearance-none px-4 py-3 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#1E293B] text-sm text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option>Juni 2024</option>
                  <option>Juli 2024</option>
                  <option>Agustus 2024</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Format Laporan (Poin 12: Bisa Diklik) */}
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">Format Laporan</label>
              <div className="flex gap-6">
                {/* Opsi PDF */}
                <button 
                  type="button"
                  onClick={() => setFormat("pdf")}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center p-1 transition-all ${format === 'pdf' ? 'border-[#0D9488]' : 'border-gray-200 dark:border-[#334155]'}`}>
                    {format === 'pdf' && <div className="w-full h-full bg-[#0D9488] rounded-full"></div>}
                  </div>
                  <span className={`text-sm ${format === 'pdf' ? 'font-bold text-[#0F172A] dark:text-[#F8FAFC]' : 'font-medium text-[#94A3B8]'}`}>PDF Document (.pdf)</span>
                </button>

                {/* Opsi Excel */}
                <button 
                  type="button"
                  onClick={() => setFormat("excel")}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center p-1 transition-all ${format === 'excel' ? 'border-[#0D9488]' : 'border-gray-200 dark:border-[#334155]'}`}>
                    {format === 'excel' && <div className="w-full h-full bg-[#0D9488] rounded-full"></div>}
                  </div>
                  <span className={`text-sm ${format === 'excel' ? 'font-bold text-[#0F172A] dark:text-[#F8FAFC]' : 'font-medium text-[#94A3B8]'}`}>Excel Sheet (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button className="w-full bg-[#0D9488] text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Download size={18} /> Hasilkan & Download Laporan
            </button>
            <Link 
              href="/laporan/preview" 
              className="w-full bg-white dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] border border-gray-200 dark:border-[#334155] py-4 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Eye size={18} /> Preview Terlebih Dahulu
            </Link>
          </div>
        </div>

        {/* KANAN: Laporan Terbaru Yang Diunduh */}
        <div className="xl:col-span-3 bg-white dark:bg-[#1E293B] p-8 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-6">
          <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]text-lg">Laporan Terbaru Yang Diunduh</h3>
          <div className="overflow-x-auto border border-gray-100 dark:border-[#334155] rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold">
                <tr>
                  <th className="px-6 py-4">Nama Laporan</th>
                  <th className="px-6 py-4 text-center">Format</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentReports.map((report, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50 dark:hover:bg-[#334155]/50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]truncate max-w-[250px]">{report.name}</p>
                      <p className="text-[11px] text-[#94A3B8] font-medium mt-0.5">{report.date} • {report.type}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-md text-[10px] font-black tracking-widest ${report.color}`}>
                          {report.format}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <button className="p-2 text-[#94A3B8] group-hover:text-primary transition-colors">
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}