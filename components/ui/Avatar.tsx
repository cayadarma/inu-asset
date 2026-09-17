import React from "react";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number; // px
  className?: string;
}

// Palet warna latar untuk avatar huruf, dipilih deterministik dari nama
// (nama yang sama selalu dapat warna yang sama, mirip pola WhatsApp)
const COLORS = [
  "#0D9488", "#7C3AED", "#DB2777", "#EA580C",
  "#2563EB", "#059669", "#CA8A04", "#DC2626",
  "#4F46E5", "#0891B2",
];

function getColorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

// Foto profil bulat: pakai foto asli kalau sudah diupload,
// kalau belum tampil lingkaran warna + huruf inisial pertama nama (default ala WhatsApp).
export default function Avatar({ name, avatarUrl, size = 44, className = "" }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: getColorForName(name || "?"),
        fontSize: size * 0.42,
      }}
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 select-none ${className}`}
    >
      {getInitial(name)}
    </div>
  );
}