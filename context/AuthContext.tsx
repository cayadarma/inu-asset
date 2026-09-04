"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession, logout as doLogout, SessionUser } from "@/lib/auth";

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

  useEffect(() => {
    const session = getSession();
    setUserState(session);
    setIsLoading(false);

    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!session && !isPublic) {
      router.replace("/login");
    }
    if (session && isPublic) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const setUser = (u: SessionUser) => setUserState(u);

  const logout = () => {
    doLogout();
    setUserState(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
