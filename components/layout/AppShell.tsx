"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isPathAllowedForRole } from "@/lib/auth";
import DashboardLayout from "./DashboardLayout";
import { LoaderCircle } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user } = useAuth();

  // --- GUARD HALAMAN BERBASIS ROLE (Operator, Manajemen, dll) ---
  // Kalau role tersebut mencoba akses halaman yang bukan bagiannya lewat URL
  // langsung, otomatis dialihkan ke Dashboard.
  useEffect(() => {
    if (!user) return;
    if (!isPathAllowedForRole(pathname, user.role)) {
      router.replace("/");
    }
  }, [user, pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
        <LoaderCircle size={28} className="animate-spin text-[#0D9488]" />
      </div>
    );
  }

  // Sementara menunggu redirect (atau kalau path sudah tidak diizinkan lagi
  // karena berubah state), jangan render konten halaman terlarang.
  if (!isPathAllowedForRole(pathname, user.role)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
        <LoaderCircle size={28} className="animate-spin text-[#0D9488]" />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}