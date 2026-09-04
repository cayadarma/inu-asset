"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { dictionary, Lang, DictionaryKey } from "@/lib/i18n/dictionary";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictionaryKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "id",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth();
  const [lang, setLangState] = useState<Lang>("id");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Prioritas: bahasa milik user login > localStorage > default id
    const saved = localStorage.getItem("inu_asset_lang") as Lang | null;
    if (user?.language) {
      setLangState(user.language);
    } else if (saved === "id" || saved === "en") {
      setLangState(saved);
    }
    setMounted(true);
  }, [user?.language]);

  const setLang = async (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("inu_asset_lang", newLang);

    if (user) {
      const updatedUser = { ...user, language: newLang };
      setUser(updatedUser);
      localStorage.setItem("inu_asset_session", JSON.stringify(updatedUser));
      await supabase.from("users").update({ language: newLang }).eq("id", user.id);
    }
  };

  const t = (key: DictionaryKey, vars?: Record<string, string | number>) => {
    let text: string = dictionary[lang][key] || dictionary.id[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  if (!mounted) return <>{children}</>;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
