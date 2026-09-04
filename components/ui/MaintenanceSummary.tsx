"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Pemetaan status work_orders -> kategori ringkasan:
// - Terjadwal  = status "Dalam Proses" DAN belum ada riwayat update (baru terbit, belum disentuh)
// - Berlangsung = status "Dalam Proses" yang sudah ada update, ATAU "Menunggu Part"
// - Selesai    = status "Selesai"
export default function MaintenanceSummary() {
  const [counts, setCounts] = useState({ terjadwal: 0, berlangsung: 0, selesai: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoading(true);

      const { data: workOrders } = await supabase
        .from("work_orders")
        .select("id, status");

      if (!workOrders) {
        setIsLoading(false);
        return;
      }

      const selesai = workOrders.filter((w) => w.status === "Selesai").length;
      const menungguPart = workOrders.filter((w) => w.status === "Menunggu Part").length;
      const dalamProsesIds = workOrders
        .filter((w) => w.status === "Dalam Proses")
        .map((w) => w.id);

      let terjadwal = 0;
      let sudahDiproses = 0;

      if (dalamProsesIds.length > 0) {
        const { data: updates } = await supabase
          .from("work_order_updates")
          .select("work_order_id")
          .in("work_order_id", dalamProsesIds);

        const idsWithUpdate = new Set((updates || []).map((u) => u.work_order_id));
        terjadwal = dalamProsesIds.filter((id) => !idsWithUpdate.has(id)).length;
        sudahDiproses = dalamProsesIds.length - terjadwal;
      }

      setCounts({
        terjadwal,
        berlangsung: sudahDiproses + menungguPart,
        selesai,
      });
      setIsLoading(false);
    };

    fetchCounts();
  }, []);

  const data = [
    { label: "TERJADWAL", count: counts.terjadwal, color: "text-[#0D9488]", bg: "bg-[#D1FAE5]/30" },
    { label: "BERLANGSUNG", count: counts.berlangsung, color: "text-[#F59E0B]", bg: "bg-[#FEF3C7]/30" },
    { label: "SELESAI", count: counts.selesai, color: "text-[#10B981]", bg: "bg-green-50/30" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-[#1E293B] rounded-[32px] border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-3 md:gap-4 lg:gap-6">
      <h3 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-base md:text-lg lg:text-lg">Daftar Work Order</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
        {data.map((item) => (
          <div key={item.label} className={`p-3 md:p-4 lg:p-6 ${item.bg} rounded-2xl border border-gray-100 dark:border-[#334155] flex flex-col gap-1 transition-all hover:scale-[1.02]`}>
            <span className="text-[9px] md:text-[10px] text-[#475569] dark:text-[#94A3B8] font-black uppercase tracking-widest">{item.label}</span>
            <span className={`text-2xl md:text-3xl font-black ${item.color}`}>
              {isLoading ? "-" : item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
