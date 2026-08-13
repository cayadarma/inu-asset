import React from "react";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="flex-1 min-w-[240px] p-5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-center text-[#94A3B8]">
        <span className="text-sm font-medium">{title}</span>
        <div className="w-9 h-9 bg-[#CCFBF1] rounded-lg flex items-center justify-center text-[#0D9488]">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[#0F172A] mt-1">{value}</div>
      <div className="text-[12px] text-[#64748B]">{description}</div>
    </div>
  );
}