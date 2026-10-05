"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, X, Check } from "lucide-react";

export interface SelectableUser {
  id: string;
  name: string;
  email: string | null;
}

interface Props {
  users: SelectableUser[];
  value: string[]; // daftar user id terpilih
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

// Dropdown pilihan ganda: tiap opsi menampilkan nama + email user. Yang terpilih tampil sebagai chip.
export default function UserMultiSelect({ users, value, onChange, placeholder = "Pilih pengawas..." }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const selected = users.filter((u) => value.includes(u.id));
  const q = query.trim().toLowerCase();
  const filtered = users.filter(
    (u) => !q || u.name.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
  );

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className="min-h-[46px] p-2 border border-gray-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-sm flex flex-wrap items-center gap-1.5 cursor-pointer focus-within:border-primary"
      >
        {selected.length === 0 && <span className="px-1 text-[#94A3B8]">{placeholder}</span>}
        {selected.map((u) => (
          <span
            key={u.id}
            className="inline-flex items-center gap-1 bg-[#F0FDFA] dark:bg-[#134E4A] text-[#0D9488] dark:text-[#5EEAD4] px-2 py-1 rounded-lg text-xs font-bold"
          >
            {u.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(u.id);
              }}
              className="hover:text-red-500"
              aria-label={`Hapus ${u.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <ChevronDown size={16} className="ml-auto mr-1 text-[#94A3B8] shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full px-3 py-2 text-sm border-b border-gray-100 dark:border-[#334155] outline-none bg-transparent dark:text-white"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-[#94A3B8]">Tidak ada user yang cocok.</div>
            )}
            {filtered.map((u) => {
              const checked = value.includes(u.id);
              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A]"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? "bg-[#0D9488] border-[#0D9488] text-white" : "border-gray-300 dark:border-[#475569]"
                    }`}
                  >
                    {checked && <Check size={12} />}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[#0F172A] dark:text-white truncate">{u.name}</span>
                    <span className="text-[11px] text-[#94A3B8] truncate">{u.email || "(belum ada email)"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}