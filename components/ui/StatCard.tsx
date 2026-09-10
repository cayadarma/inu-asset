"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";

export default function StatCard({ title, value, description, icon, href, extra }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  // Lacak posisi kursor relatif terhadap card, dipakai untuk titik pusat efek glow
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  };

  const content = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        background: isHovering
          ? `radial-gradient(220px circle at ${pos.x}% ${pos.y}%, rgba(13,148,136,0.12), transparent 70%)`
          : undefined,
      }}
      className="relative flex-1 min-w-[240px] p-5 bg-white dark:bg-[#1E293B] rounded-xl border border-gray-100 dark:border-[#334155] shadow-sm flex flex-col gap-2 transition-shadow duration-300 overflow-hidden hover:shadow-md hover:border-[#0D9488]/30"
    >
      <div className="flex justify-between items-center text-[#94A3B8]">
        <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
        <div className="w-9 h-9 bg-[#CCFBF1] dark:bg-[#115E59]/30 rounded-lg flex items-center justify-center text-[#0D9488] dark:text-[#37BAAE]">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black text-[#0F172A] dark:text-[#F8FAFC] mt-1">{value}</div>
      <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] font-medium">{description}</div>
      {extra && <div className="mt-1 pt-2 border-t border-gray-50 dark:border-[#334155]">{extra}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-xl transition-transform duration-300 hover:-translate-y-0.5">
        {content}
      </Link>
    );
  }

  return content;
}