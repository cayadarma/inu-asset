import { Lang } from "./dictionary";

// Cache di memori browser (per sesi tab) supaya teks yang sudah diterjemahkan
// dalam sesi ini tidak fetch ulang ke /api/translate (yang sendiri juga punya
// cache di Supabase). Jadi ada 2 lapis cache: memori (tercepat) -> DB -> DeepL.
const memoryCache = new Map<string, string>(); // key: `${lang}::${text}`

function cacheKey(lang: Lang, text: string) {
  return `${lang}::${text}`;
}

/**
 * Terjemahkan sekumpulan teks dinamis (nama lokasi, nama aset, spesifikasi, dll).
 * Kalau lang === "id", langsung balikin teks asli (data memang berbahasa Indonesia).
 * Kalau lang === "en", cek memory cache dulu, sisanya baru fetch ke /api/translate.
 *
 * @returns Map dari teks asli -> teks hasil terjemahan (atau teks asli kalau lang id / gagal)
 */
export async function translateTexts(
  texts: (string | null | undefined)[],
  lang: Lang
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const cleanTexts = Array.from(
    new Set(texts.map((t) => (t ?? "").trim()).filter((t) => t.length > 0))
  );

  if (cleanTexts.length === 0) return result;

  // Bahasa Indonesia = tampilkan apa adanya, tidak perlu translate
  if (lang === "id") {
    cleanTexts.forEach((t) => result.set(t, t));
    return result;
  }

  const toFetch: string[] = [];
  cleanTexts.forEach((t) => {
    const cached = memoryCache.get(cacheKey(lang, t));
    if (cached !== undefined) {
      result.set(t, cached);
    } else {
      toFetch.push(t);
    }
  });

  if (toFetch.length === 0) return result;

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: toFetch, targetLang: "EN" }),
    });
    const data = await res.json();
    const translations: Record<string, string> = data.translations || {};

    toFetch.forEach((t) => {
      const translated = translations[t] ?? t; // fallback ke teks asli kalau gagal
      memoryCache.set(cacheKey(lang, t), translated);
      result.set(t, translated);
    });
  } catch (err) {
    console.error("translateTexts fetch error:", err);
    // Fallback: tampilkan teks asli daripada error/blank
    toFetch.forEach((t) => result.set(t, t));
  }

  return result;
}

/** Versi single-text dari translateTexts, untuk pemakaian yang lebih ringkas. */
export async function translateText(text: string | null | undefined, lang: Lang): Promise<string> {
  if (!text) return "";
  const map = await translateTexts([text], lang);
  return map.get(text.trim()) ?? text;
}