// lib/notifyClient.ts
//
// Dipanggil dari browser SETELAH data berhasil disimpan. Fire-and-forget: kegagalan email
// TIDAK boleh menggagalkan atau memperlambat alur utama pengguna.
// Permintaan membawa token login supaya server tahu siapa yang memanggil.
import { supabase } from "@/lib/supabase";

export type NotifyType =
  | "damage_report"
  | "work_order_created"
  | "work_order_update"
  | "emergency"
  | "low_stock";

export function fireNotification(type: NotifyType, id: string | number | null | undefined): void {
  if (id === null || id === undefined || id === "") return;

  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, id: String(id) }),
        keepalive: true, // tetap terkirim walau halaman langsung berpindah
      });
    } catch (err) {
      console.warn("[notify] gagal mengirim permintaan notifikasi:", err);
    }
  })();
}