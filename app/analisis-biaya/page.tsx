import React from "react";
import { Banknote, TrendingUp, ChevronDown } from "lucide-react";

export default function CostAnalysisPage() {
  // 1. Data Ringkasan Atas
  const summary = [
    { label: "Total Biaya Pemeliharaan", val: "Rp 737.5 M", desc: "Akumulasi 6 bulan terakhir", color: "text-[#0F172A]" },
    { label: "Biaya Pemeliharaan", val: "Rp 312.0 M", desc: "Rutin terjadwal", color: "text-[#0D9488]" },
    { label: "Biaya Perbaikan", val: "Rp 425.5 M", desc: "Kerusakan darurat", color: "text-[#EF4444]" },
  ];

  // 2. Data Biaya per Lokasi (Progress Bar)
  const costByLocation = [
    { name: "Power Plant", val: "Rp 345.2M", percent: 80 },
    { name: "ITDC Office", val: "Rp 210.8M", percent: 60 },
    { name: "Workshop", val: "Rp 142.1M", percent: 45 },
    { name: "Utility Area", val: "Rp 98.4M", percent: 30 },
    { name: "Warehouse", val: "Rp 51.0M", percent: 15 },
  ];

  // 3. Data Grafik Batang Bulanan
  const monthlyCosts = [
    { m: "Jan", v: 90 }, { m: "Feb", v: 120 }, { m: "Mar", v: 142 },
    { m: "Apr", v: 110 }, { m: "Mei", v: 165 }, { m: "Jun", v: 220 },
    { m: "Jul", v: 165 },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* HEADER & FILTER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Analisis Biaya</h1>
          <p className="text-[#475569] text-sm">Pantau and analisis pengeluaran pemeliharaan aset secara real-time</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#475569] cursor-pointer">
            <span>Januari 2024 - Juni 2024</span>
            <ChevronDown size={16} />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#475569] cursor-pointer">
            <span>Semua Lokasi</span>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* ROW 1: SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summary.map((item) => (
          <div key={item.label} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[14px] text-[#475569] font-medium">{item.label}</span>
              <div className="w-9 h-9 bg-[#CCFBF1] rounded-lg flex items-center justify-center text-[#0D9488]">
                <Banknote size={20} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${item.color}`}>{item.val}</div>
            <p className="text-[12px] text-[#94A3B8] mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* ROW 2: CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* KIRI: Grafik Batang Bulanan */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
          <h3 className="font-bold text-[#0F172A] mb-10 text-base">Biaya Pemeliharaan Bulanan</h3>
          <div className="flex-1 flex items-end justify-between gap-4 h-[220px] pt-10 border-b border-gray-50 pb-2">
            {monthlyCosts.map((data) => (
              <div key={data.m} className="flex-1 h-full flex flex-col justify-end items-center gap-3 group">
                <div 
                  style={{ height: `${(data.v / 250) * 100}%` }} 
                  className="w-full bg-[#0D9488] rounded-t-md hover:bg-teal-600 transition-all cursor-pointer relative"
                >
                   {/* Tooltip Angka */}
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                      Rp {data.v}M
                   </div>
                </div>
                <span className="text-[12px] text-[#94A3B8] font-bold">{data.m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KANAN: Biaya Berdasarkan Lokasi */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-[#0F172A] mb-8 text-base">Biaya Berdasarkan Lokasi</h3>
          <div className="flex flex-col gap-6 flex-1 justify-center">
            {costByLocation.map((loc) => (
              <div key={loc.name} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-[#475569]">{loc.name}</span>
                  <span className="font-bold text-[#0F172A]">{loc.val}</span>
                </div>
                <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${loc.percent}%` }} 
                    className="h-full bg-[#0D9488] rounded-full transition-all duration-1000"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ROW 3: DETAIL TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b border-gray-100">
           <h3 className="font-bold text-[#0F172A] text-base">Biaya Pemeliharaan Per Aset</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b text-[#475569] font-bold">
              <tr>
                <th className="px-6 py-4">Nama Aset</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Biaya Pencegahan</th>
                <th className="px-6 py-4">Biaya Korektif</th>
                <th className="px-6 py-4">Total Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { name: "Genset Caterpillar 3516", loc: "ITDC Office", prev: "45M", corr: "120M", total: "165M" },
                { name: "Chiller York Central #1", loc: "Workshop", prev: "32M", corr: "85M", total: "117M" },
                { name: "Transformator Schneider", loc: "Utility Area", prev: "18M", corr: "95M", total: "113M" },
                { name: "Pompa Centrifugal Ebara", loc: "Power Plant", prev: "24M", corr: "65M", total: "89M" },
                { name: "Compressor Atlas Copco", loc: "Power Plant", prev: "35M", corr: "40M", total: "75M" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-[#0F172A]">{row.name}</td>
                  <td className="px-6 py-4 text-[#475569]">{row.loc}</td>
                  <td className="px-6 py-4 text-[#475569]">Rp {row.prev}</td>
                  <td className="px-6 py-4 text-[#475569]">Rp {row.corr}</td>
                  <td className="px-6 py-4 font-bold text-[#0D9488]">Rp {row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}