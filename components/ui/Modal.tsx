"use client";

import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-10 overflow-y-auto bg-black/50 backdrop-blur-sm transition-all">
      {/* Konten Modal - Ditambahkan class dark: untuk mode gelap */}
      <div className="relative bg-white dark:bg-[#1E293B] dark:bg-[#1E293B] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto border dark:border-[#334155]">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 dark:border-[#334155] dark:border-[#334155]">
          <h3 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] dark:text-[#F8FAFC]dark:text-[#F8FAFC]">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#0F172A] rounded-full transition-colors"
          >
            <X size={24} className="text-[#94A3B8]" />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-8 dark:text-[#F8FAFC]">
          {children}
        </div>
      </div>
    </div>
  );
}