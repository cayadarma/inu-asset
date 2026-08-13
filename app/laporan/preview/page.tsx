import React from "react";
import { ChevronLeft, Download, Printer } from "lucide-react";
import Link from "next/link";

export default function ReportPreviewPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <Link href="/laporan" className="flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-dark">
          <ChevronLeft size={20} /> Kembali
        </Link>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-[#475569] hover:bg-gray-50">
            <Printer size={18} /> Cetak
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-bold hover:bg-teal-700">
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      {/* KERTAS LAPORAN */}
      <div className="bg-white p-12 md:p-16 shadow-xl border border-gray-200 rounded-sm min-h-[1000px] flex flex-col gap-10">
        {/* Kop Surat */}
        <div className="flex justify-between items-start border-b-2 border-dark pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-black text-2xl">I</div>
            <div>
              <h2 className="text-xl font-black text-dark tracking-tighter">INU Asset MANAGEMENT</h2>
              <p className="text-xs text-muted-text">PT. INU Asset Solusindo, Tbk.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-secondary">DOKUMEN INTERNAL</p>
            <p className="text-[10px] text-muted-text">Ref: EAM-MP-202406</p>
          </div>
        </div>

        {/* Judul Laporan */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold text-dark uppercase underline">Laporan Bulanan Pemeliharaan</h1>
          <p className="text-sm text-secondary font-medium uppercase">Lokasi: Power Plant — Periode: Juni 2024</p>
        </div>

        {/* Kotak Ringkasan */}
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center">
            <span className="text-[10px] text-secondary font-bold uppercase mb-1">Total Kegiatan</span>
            <span className="text-xl font-black text-dark">45 Kegiatan</span>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center">
            <span className="text-[10px] text-secondary font-bold uppercase mb-1">Tepat Waktu</span>
            <span className="text-xl font-black text-[#10B981]">42 Kegiatan</span>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center">
            <span className="text-[10px] text-secondary font-bold uppercase mb-1">Max Downtime</span>
            <span className="text-xl font-black text-[#F59E0B]">2 Jam</span>
          </div>
        </div>

        {/* Tabel Data Preview */}
        <div className="flex-1">
          <table className="w-full border-collapse border border-gray-300 text-[12px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2">ID WO</th>
                <th className="border border-gray-300 p-2">Deskripsi</th>
                <th className="border border-gray-300 p-2">Aset</th>
                <th className="border border-gray-300 p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="border border-gray-300 p-2">WO-89{i}</td>
                  <td className="border border-gray-300 p-2 font-bold italic">Kalibrasi sensor pressure uap rutin berkala</td>
                  <td className="border border-gray-300 p-2 text-center text-[#475569]">Turbin #{i}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold text-green-600">Selesai</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan */}
        <div className="flex justify-between items-end pt-10">
          <div className="flex flex-col gap-20">
            <p className="text-xs font-bold">Disiapkan Oleh:</p>
            <div className="border-t border-dark pt-2">
              <p className="text-xs font-bold text-dark">Budi Santoso</p>
              <p className="text-[10px] text-muted-text italic">Supervisor Pemeliharaan</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-20">
            <p className="text-xs font-bold">Disetujui Oleh:</p>
            <div className="border-t border-dark pt-2 text-right">
              <p className="text-xs font-bold text-dark">Administrator</p>
              <p className="text-[10px] text-muted-text italic">General Manager</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}