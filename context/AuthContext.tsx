"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { restoreSession, logout as doLogout, SessionUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  setUser: (user: SessionUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  setUser: () => {},
  logout: () => {},
});

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 1) Saat aplikasi dibuka: pulihkan sesi (diverifikasi ke server Supabase)
  //    dan pantau kalau sesi berakhir (token kedaluwarsa, logout dari tab lain, dll).
  useEffect(() => {
    let active = true;

    (async () => {
      const session = await restoreSession();
      if (!active) return;
      setUserState(session);
      setIsLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUserState(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 2) Pengalihan halaman: belum login -> /login, sudah login -> keluar dari /login
  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!user && !isPublic) {
      router.replace("/login");
    }
    if (user && isPublic) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, pathname]);

  const setUser = (u: SessionUser) => setUserState(u);

  const logout = () => {
    doLogout().finally(() => {
      setUserState(null);
      router.replace("/login");
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);