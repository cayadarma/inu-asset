// lib/notifyClient.ts
//
// Dipanggil dari browser SETELAH data berhasil disimpan. Fire-and-forget: kegagalan email
// TIDAK boleh menggagalkan atau memperlambat alur utama pengguna.

export type NotifyType =
  | "damage_report"
  | "work_order_created"
  | "work_order_update"
  | "emergency"
  | "low_stock";

export function fireNotification(type: NotifyType, id: string | number | null | undefined): void {
  if (id === null || id === undefined || id === "") return;
  try {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id: String(id) }),
      keepalive: true, // tetap terkirim walau halaman langsung berpindah
    }).catch((err) => console.warn("[notify] gagal mengirim permintaan notifikasi:", err));
  } catch (err) {
    console.warn("[notify] error:", err);
  }
}