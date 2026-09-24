import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// DeepL Free endpoint. Kalau nanti upgrade ke paket Pro, ganti ke api.deepl.com
const DEEPL_ENDPOINT = "https://api-free.deepl.com/v2/translate";

interface TranslateRequestBody {
  texts: string[];
  targetLang: "EN" | "ID";
}

// Bahasa asal data di database kita selalu Bahasa Indonesia.
// Jadi endpoint ini cuma dipakai untuk arah ID -> EN.
// Kalau lang dipilih ID, frontend tidak perlu panggil endpoint ini sama sekali
// (tampilkan data asli langsung).

export async function POST(req: NextRequest) {
  try {
    const body: TranslateRequestBody = await req.json();
    const { texts, targetLang } = body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ translations: {} });
    }
    if (targetLang !== "EN") {
      // Hanya support translate ke EN untuk sekarang (sumber data selalu ID)
      return NextResponse.json({ translations: {} });
    }

    // Bersihkan: buang string kosong/whitespace & duplikat
    const uniqueTexts = Array.from(
      new Set(texts.map((t) => (t ?? "").trim()).filter((t) => t.length > 0))
    );

    if (uniqueTexts.length === 0) {
      return NextResponse.json({ translations: {} });
    }

    const result: Record<string, string> = {};

    // 1. Cek cache di Supabase dulu
    const { data: cached, error: cacheErr } = await supabaseAdmin
      .from("translations")
      .select("source_text, translated_text")
      .eq("target_lang", targetLang)
      .in("source_text", uniqueTexts);

    if (cacheErr) {
      console.error("Translate cache lookup error:", cacheErr);
    }

    const cachedMap = new Map<string, string>();
    (cached || []).forEach((row) => cachedMap.set(row.source_text, row.translated_text));

    uniqueTexts.forEach((t) => {
      if (cachedMap.has(t)) result[t] = cachedMap.get(t)!;
    });

    // 2. Teks yang belum ada di cache -> panggil DeepL
    const missing = uniqueTexts.filter((t) => !cachedMap.has(t));

    if (missing.length > 0) {
      const apiKey = process.env.DEEPL_API_KEY;
      if (!apiKey) {
        console.error("DEEPL_API_KEY belum diset di environment variable");
        // Fallback: kembalikan teks asli supaya UI tidak rusak walau belum ada key
        missing.forEach((t) => (result[t] = t));
        return NextResponse.json({ translations: result, warning: "DEEPL_API_KEY not configured" });
      }

      const deeplRes = await fetch(DEEPL_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: missing,
          source_lang: "ID",
          target_lang: "EN-US",
        }),
      });

      if (!deeplRes.ok) {
        const errText = await deeplRes.text();
        console.error("DeepL API error:", deeplRes.status, errText);
        // Fallback: teks asli, jangan sampai UI blank/error
        missing.forEach((t) => (result[t] = t));
        return NextResponse.json({ translations: result, warning: "DeepL API error" });
      }

      const deeplData = await deeplRes.json();
      const translatedList: string[] = (deeplData.translations || []).map(
        (t: { text: string }) => t.text
      );

      const rowsToInsert: { source_text: string; source_lang: string; target_lang: string; translated_text: string }[] = [];

      missing.forEach((original, idx) => {
        const translated = translatedList[idx] ?? original;
        result[original] = translated;
        rowsToInsert.push({
          source_text: original,
          source_lang: "id",
          target_lang: targetLang,
          translated_text: translated,
        });
      });

      // 3. Simpan hasil baru ke cache (upsert supaya aman kalau ada race condition)
      const { error: insertErr } = await supabaseAdmin
        .from("translations")
        .upsert(rowsToInsert, { onConflict: "source_text,target_lang" });

      if (insertErr) {
        console.error("Translate cache insert error:", insertErr);
      }
    }

    return NextResponse.json({ translations: result });
  } catch (err) {
    console.error("Translate route error:", err);
    return NextResponse.json({ translations: {}, error: "Internal error" }, { status: 500 });
  }
}