"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FinancialReport } from "@/lib/reportFinance";
import { CostCategory } from "@/lib/costQueries";
import Pagination from "@/components/ui/Pagination";

interface FinancialTransactionTableProps {
  data: FinancialReport | null;
  isLoading: boolean;
}

const PAGE_SIZE = 10;

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const CATEGORY_BADGE: Record<CostCategory, string> = {
  Pemeliharaan: "bg-teal-50 dark:bg-teal-950/30 text-[#0D9488]",
  Perbaikan: "bg-orange-50 dark:bg-orange-950/30 text-[#E28E00]",
  "Pembelian Stok": "bg-blue-50 dark:bg-blue-950/30 text-[#3B82F6]",
  "Pembelian Aset": "bg-violet-50 dark:bg-violet-950/30 text-[#8B5CF6]",
};

export default function FinancialTransactionTable({ data, isLoading }: FinancialTransactionTableProps) {
  const [page, setPage] = useState(1);
  const rows = data?.detailRows ?? [];

  // --- RESET KE HALAMAN 1 SETIAP KALI DATA/PERIODE BERUBAH ---
  useEffect(() => {
    setPage(1);
  }, [data]);

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-[#334155]">
        <h4 className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-sm">Rincian Transaksi Biaya</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b text-[#475569] dark:text-[#94A3B8] font-bold text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Tanggal</th>
              <th className="px-6 py-3">Kategori</th>
              <th className="px-6 py-3">Deskripsi</th>
              <th className="px-6 py-3">Lokasi</th>
              <th className="px-6 py-3 text-right">Jumlah Biaya</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#334155]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8] italic">Memuat data...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8] italic">Belum ada transaksi biaya pada periode ini.</td></tr>
            ) : (
              pagedRows.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#334155]/50">
                  <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8] font-medium whitespace-nowrap">
                    {tx.date ? new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${CATEGORY_BADGE[tx.category]}`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <Link href={tx.href} className="font-bold text-[#0F172A] dark:text-[#F8FAFC] hover:text-[#0D9488] transition-colors">
                      {tx.description}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-[#475569] dark:text-[#94A3B8]">{tx.location || "-"}</td>
                  <td className="px-6 py-3 text-right font-black text-[#0D9488]">{formatRupiah(tx.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!isLoading && rows.length > 0 && (
        <Pagination currentPage={page} totalCount={rows.length} itemsPerPage={PAGE_SIZE} onPageChange={setPage} itemLabel="transaksi" />
      )}
    </div>
  );
}