import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Penanda pilihan "Ingat saya di perangkat ini" (disimpan di localStorage).
// "1" = sesi disimpan di localStorage (bertahan walau browser ditutup)
// "0" = sesi disimpan di sessionStorage (hilang saat tab/browser ditutup)
export const REMEMBER_FLAG_KEY = "inu_remember_me";

// Penyimpanan token login Supabase Auth yang mengikuti pilihan "Ingat saya".
// Dibuat dengan pengecekan `window` di dalam fungsi supaya aman saat
// halaman dirender di server (Next.js).
const authStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    const remember = window.localStorage.getItem(REMEMBER_FLAG_KEY) === "1";
    if (remember) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

// Koneksi tunggal ke Supabase. Sekarang membawa sesi login (Supabase Auth),
// jadi setiap request ke database dikenali sebagai user yang sedang login.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: authStorage,
  },
});