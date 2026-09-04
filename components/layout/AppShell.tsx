"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "./DashboardLayout";
import { LoaderCircle } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, user } = useAuth();

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

  return <DashboardLayout>{children}</DashboardLayout>;
}
