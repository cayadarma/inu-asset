import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Kebijakan konten LENGKAP, dipasang dalam mode "Report-Only": pelanggaran hanya
// dicatat di Console browser (tidak memblokir apa pun). Setelah beberapa hari
// dipakai tanpa pesan "[Report Only] Refused to ...", baru dijadikan mode tegas.
const reportOnlyCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://placehold.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
].join("; ");

const securityHeaders = [
  // Mencegah browser "menebak" tipe file (menahan serangan lewat file unggahan)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Halaman tidak boleh ditampilkan di dalam situs lain (clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Alamat halaman tidak dibocorkan penuh ke situs lain saat klik tautan keluar
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Fitur perangkat yang tidak dipakai dimatikan
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Paksa HTTPS (2 tahun)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Bagian CSP yang AMAN dan langsung tegas (tidak mengganggu skrip aplikasi)
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  // CSP lengkap, hanya mencatat (production saja, supaya Console saat pengembangan tidak berisik)
  ...(isProd
    ? [{ key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp }]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.1.19.101"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;