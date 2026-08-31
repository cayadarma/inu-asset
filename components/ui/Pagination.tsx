"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalCount, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Jika halaman cuma 1, tidak perlu tampilkan pagination
  if (totalPages <= 1) return null;

  // Logika untuk menentukan angka mana saja yang muncul (dengan titik-titik)
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage > totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="px-6 py-4 bg-white dark:bg-[#1E293B] border-t border-gray-100 dark:border-[#334155] flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Info Teks */}
      <span className="text-sm text-[#94A3B8] font-medium font-poppins">
        Menampilkan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} dari {totalCount} aset
      </span>
      
      {/* Tombol-tombol (Gaya Sesuai Gambar) */}
      <div className="flex items-center gap-2 font-poppins">
        {/* Tombol Sebelumnya */}
        <button 
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-4 py-2 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold text-[#475569] dark:text-[#F8FAFC] disabled:opacity-30 hover:bg-gray-100 transition-all"
        >
          Sebelumnya
        </button>

        {/* Daftar Angka */}
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            disabled={page === "..."}
            onClick={() => typeof page === "number" && onPageChange(page)}
            className={`w-10 h-10 rounded-lg text-sm font-bold transition-all border
              ${page === currentPage 
                ? "bg-[#0D9488] border-[#0D9488] text-white shadow-md" 
                : page === "..." 
                  ? "bg-transparent border-transparent text-[#94A3B8] cursor-default"
                  : "bg-[#F8FAFC] dark:bg-[#0F172A] border-gray-200 dark:border-[#334155] text-[#475569] dark:text-[#F8FAFC] hover:bg-gray-100"
              }
            `}
          >
            {page}
          </button>
        ))}

        {/* Tombol Selanjutnya */}
        <button 
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-4 py-2 bg-[#F8FAFC] dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] rounded-lg text-sm font-bold text-[#475569] dark:text-[#F8FAFC] disabled:opacity-30 hover:bg-gray-100 transition-all"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
}