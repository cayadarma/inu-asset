// Pemanggil API server dari browser.
// Otomatis menyertakan token login (Authorization: Bearer ...) supaya server
// bisa memverifikasi siapa yang memanggil dan role-nya.
import { supabase } from "@/lib/supabase";

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: "POST" | "PATCH" | "DELETE" | "GET"; body?: unknown } = {}
): Promise<ApiResult<T>> {
  // getSession otomatis memperbarui token kalau hampir kedaluwarsa
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, status: 401, error: "Sesi berakhir. Silakan login ulang." };
  }

  try {
    const res = await fetch(path, {
      method: options.method || "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;

    if (!res.ok) {
      return { ok: false, status: res.status, error: json?.error || "Terjadi kesalahan." };
    }
    return { ok: true, status: res.status, data: (json ?? undefined) as T | undefined };
  } catch {
    return { ok: false, status: 0, error: "Tidak dapat terhubung ke server." };
  }
}