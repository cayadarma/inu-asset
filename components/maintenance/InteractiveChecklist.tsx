"use client"; // Wajib agar bisa diklik

import React, { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

interface Task {
  task: string;
  tech: string;
  note: string;
  status: "Selesai" | "Berlangsung";
}

export default function InteractiveChecklist({ title, initialTasks }: { title: string, initialTasks: Task[] }) {
  // Simpan data tabel di dalam state agar bisa diubah-ubah saat diklik
  const [tasks, setTasks] = useState(initialTasks);

  const toggleStatus = (index: number) => {
    const newTasks = [...tasks];
    // Ganti status bolak-balik (Simulasi klik)
    newTasks[index].status = newTasks[index].status === "Selesai" ? "Berlangsung" : "Selesai";
    setTasks(newTasks);
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden mb-6">
      <div className="p-4 bg-white dark:bg-[#1E293B] border-b border-gray-100 dark:border-[#334155]">
        <h3 className="font-bold text-[#0D9488]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] dark:bg-[#0F172A] dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8] font-bold border-b">
            <tr>
              <th className="px-6 py-4">Task / Langkah Kerja</th>
              <th className="px-6 py-4">Teknisi</th>
              <th className="px-6 py-4">Catatan</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#334155] dark:divide-[#334155]">
            {tasks.map((item, i) => (
              <tr 
                key={i} 
                className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                onClick={() => toggleStatus(i)} // Fungsi klik di sini
              >
                <td className="px-6 py-4 flex items-center gap-3">
                  {item.status === "Selesai" ? (
                    <CheckCircle2 size={20} className="text-[#10B981] animate-in zoom-in duration-300" />
                  ) : (
                    <Circle size={20} className="text-[#94A3B8] group-hover:text-[#0D9488]" />
                  )}
                  <span className={item.status === "Selesai" ? "text-gray-400 line-through" : "text-[#0F172A] dark:text-[#F8FAFC]"}>
                    {item.task}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#475569] dark:text-[#94A3B8]">{item.tech}</td>
                <td className="px-6 py-4 text-[#475569] dark:text-[#94A3B8] italic">{item.note}</td>
                <td className="px-6 py-4">
                  <div className={`flex items-center gap-2 font-bold ${item.status === 'Selesai' ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    <div className={`w-2 h-2 rounded-full ${item.status === 'Selesai' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}></div>
                    {item.status}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}