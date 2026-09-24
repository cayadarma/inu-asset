"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translateTexts } from "./dynamicTranslate";

/**
 * Hook untuk translate SATU teks dinamis dari database (nama lokasi, nama aset, dll).
 * Otomatis re-translate saat bahasa berganti. Selama proses translate, kembalikan
 * teks asli dulu (bukan blank) supaya UI tidak "flicker" kosong.
 *
 * Pemakaian: const namaTampil = useDynamicText(loc.name);
 */
export function useDynamicText(text: string | null | undefined): string {
  const { lang } = useLanguage();
  const [display, setDisplay] = useState(text || "");

  useEffect(() => {
    let active = true;
    if (!text) {
      setDisplay("");
      return;
    }
    if (lang === "id") {
      setDisplay(text);
      return;
    }
    translateTexts([text], lang).then((map) => {
      if (active) setDisplay(map.get(text.trim()) ?? text);
    });
    return () => {
      active = false;
    };
  }, [text, lang]);

  return display;
}

/**
 * Hook untuk translate SEKUMPULAN teks dinamis sekaligus (mis. daftar lokasi/aset di tabel).
 * Lebih efisien daripada panggil useDynamicText satu-satu karena request-nya digabung jadi 1 batch.
 *
 * Pemakaian:
 *   const map = useDynamicTextMap(locations.map(l => l.name));
 *   ... map.get(loc.name) ...
 */
export function useDynamicTextMap(texts: (string | null | undefined)[]): Map<string, string> {
  const { lang } = useLanguage();
  const [map, setMap] = useState<Map<string, string>>(new Map());
  // Stabilkan dependency array dengan join, supaya tidak infinite loop tiap render
  const key = texts.filter(Boolean).join("|");

  useEffect(() => {
    let active = true;
    translateTexts(texts, lang).then((result) => {
      if (active) setMap(result);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang]);

  return map;
}