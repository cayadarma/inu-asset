// lib/notify.ts
//
// Logika notifikasi email (SERVER ONLY). Dipanggil dari:
//   - app/api/notify/route.ts            (dipicu browser setelah insert/update berhasil)
//   - app/api/cron/reminders/route.ts    (pengingat pemeliharaan pencegahan 07:00 WITA)
//
// Aturan penerima:
//   Laporan kerusakan / WO terbit / update WO / stok menipis -> super_admin + administrator
//   WO terbit & update WO                                    -> + pengawas yang dipilih di WO itu
//   Perbaikan mendadak                                       -> super_admin + administrator + operator
//   Pengingat pemeliharaan pencegahan                        -> operator
//   Role "manajemen" tidak menerima apa pun.
// Semua penerima: hanya user status "active", punya email, dan notification_settings.notifEmail
// tidak dimatikan.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmails, renderEmail, type EmailMessage, type SendResult } from "@/lib/email";
import { getWitaDateStr } from "@/lib/assetSnapshot";

type Role = "super_admin" | "administrator" | "manajemen" | "operator";

interface Recipient {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const ADMIN_ROLES: Role[] = ["super_admin", "administrator"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "";
}

function link(path: string): string | undefined {
  const b = baseUrl();
  return b ? `${b}${path}` : undefined;
}

// Ambil user penerima berdasarkan role dan/atau daftar id
async function fetchRecipients(opts: { roles?: Role[]; ids?: string[] }): Promise<Recipient[]> {
  const found = new Map<string, Recipient>();

  const push = (rows: any[] | null) => {
    for (const u of rows || []) {
      if (u.status !== "active") continue;
      if (!u.email || !EMAIL_RE.test(String(u.email).trim())) continue;
      if (u.notification_settings?.notifEmail === false) continue;
      if (u.role === "manajemen") continue;
      found.set(u.id, { id: u.id, name: u.name, email: String(u.email).trim(), role: u.role });
    }
  };

  const cols = "id, name, email, role, status, notification_settings";
  if (opts.roles && opts.roles.length > 0) {
    const { data } = await supabaseAdmin.from("users").select(cols).in("role", opts.roles);
    push(data);
  }
  if (opts.ids && opts.ids.length > 0) {
    const { data } = await supabaseAdmin.from("users").select(cols).in("id", opts.ids);
    push(data);
  }
  return Array.from(found.values());
}


type NotifyResult = SendResult & { debug?: unknown };

// Penjelasan per pengawas: kenapa dia menerima / tidak menerima email (untuk debugging di DevTools)
async function explainSupervisors(ids: string[]) {
  if (ids.length === 0) {
    return ["supervisor_ids KOSONG di Work Order ini (pengawas tidak tersimpan, atau tidak ada yang dipilih)"];
  }
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, status, notification_settings")
    .in("id", ids);
  const byId = new Map((data || []).map((u: any) => [String(u.id), u]));
  return ids.map((id) => {
    const u: any = byId.get(String(id));
    if (!u) return `${id}: TIDAK ditemukan di tabel users`;
    let why = "OK, dapat email";
    if (u.status !== "active") why = `TIDAK dapat: status "${u.status}" (bukan active)`;
    else if (!u.email || !EMAIL_RE.test(String(u.email).trim())) why = "TIDAK dapat: email kosong/tidak valid";
    else if (u.notification_settings?.notifEmail === false) why = "TIDAK dapat: toggle Notifikasi Email dimatikan";
    else if (u.role === "manajemen") why = "TIDAK dapat: role manajemen tidak menerima notifikasi";
    return `${u.name} <${u.email || "-"}> [${u.role}]: ${why}`;
  });
}

async function send(messages: EmailMessage[]): Promise<SendResult> {
  return sendEmails(messages);
}

function assetLabel(asset: any): string {
  if (!asset) return "-";
  const loc = asset.locations?.name;
  return loc ? `${asset.name} (${loc})` : asset.name;
}

// ---------------------------------------------------------------------------
// 1. Laporan kerusakan baru -> admin
// ---------------------------------------------------------------------------
export async function notifyDamageReport(reportId: string): Promise<SendResult> {
  const { data: r } = await supabaseAdmin
    .from("damage_reports")
    .select("id, reporter_name, issue_title, description, urgency, incident_date, asset_id, assets(name, locations(name))")
    .eq("id", reportId)
    .maybeSingle();
  if (!r) return { sent: 0, failed: 0, errors: [], skipped: "Laporan tidak ditemukan" };

  const recipients = await fetchRecipients({ roles: ADMIN_ROLES });
  const html = renderEmail({
    heading: "Laporan Kerusakan Baru",
    intro: `${r.reporter_name || "Seseorang"} melaporkan kerusakan aset.`,
    rows: [
      { label: "Aset", value: assetLabel(r.assets) },
      { label: "Masalah", value: r.issue_title },
      { label: "Urgensi", value: r.urgency },
      { label: "Pelapor", value: r.reporter_name },
      { label: "Tanggal kejadian", value: r.incident_date },
      { label: "Keterangan", value: r.description },
    ],
    buttonLabel: "Buka Buku Sakit",
    buttonUrl: link("/buku-sakit"),
  });
  return send(
    recipients.map((u) => ({ to: u.email, subject: `Laporan kerusakan: ${r.issue_title || "aset"}`, html }))
  );
}

// ---------------------------------------------------------------------------
// 2. Work Order baru diterbitkan -> admin + pengawas terpilih
// ---------------------------------------------------------------------------
export async function notifyWorkOrderCreated(woId: string): Promise<NotifyResult> {
  const { data: wo } = await supabaseAdmin
    .from("work_orders")
    .select("id, tgl, kategori, trouble, tech_name, supervisor, supervisor_ids, priority, tindak_lanjut, issued_by, is_history, assets(name, locations(name))")
    .eq("id", woId)
    .maybeSingle();
  if (!wo) return { sent: 0, failed: 0, errors: [], skipped: "Work Order tidak ditemukan" };
  if (wo.is_history) return { sent: 0, failed: 0, errors: [], skipped: "Work Order riwayat (is_history) tidak mengirim email" };

  const supervisorIds: string[] = Array.isArray(wo.supervisor_ids) ? wo.supervisor_ids : [];
  const recipients = await fetchRecipients({ roles: ADMIN_ROLES, ids: supervisorIds });

  const make = (isSupervisor: boolean) =>
    renderEmail({
      heading: `Work Order Baru: ${wo.id}`,
      intro: "Sebuah Work Order baru telah diterbitkan.",
      rows: [
        { label: "Aset", value: assetLabel(wo.assets) },
        { label: "Masalah", value: wo.trouble },
        { label: "Kategori", value: wo.kategori },
        { label: "Prioritas", value: wo.priority },
        { label: "Tanggal", value: wo.tgl },
        { label: "Pengawas", value: wo.supervisor },
        { label: "Pelaksana", value: wo.tech_name },
        { label: "Diterbitkan oleh", value: wo.issued_by },
        { label: "Tindakan", value: wo.tindak_lanjut },
      ],
      note: isSupervisor ? "Anda ditunjuk sebagai pengawas pada Work Order ini." : undefined,
      buttonLabel: "Buka Work Order",
      buttonUrl: link(`/pemeliharaan/korektif/${encodeURIComponent(wo.id)}`),
    });

  const res = await send(
    recipients.map((u) => ({
      to: u.email,
      subject: `Work Order baru ${wo.id}: ${wo.trouble || ""}`.trim(),
      html: make(supervisorIds.includes(u.id)),
    }))
  );
  return {
    ...res,
    debug: {
      supervisor_ids_tersimpan: supervisorIds,
      pengawas: await explainSupervisors(supervisorIds),
      penerima: recipients.map((u) => `${u.name} <${u.email}> [${u.role}]${supervisorIds.includes(u.id) ? " (pengawas)" : ""}`),
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Update Work Order -> admin + pengawas terpilih
// ---------------------------------------------------------------------------
export async function notifyWorkOrderUpdate(woId: string): Promise<NotifyResult> {
  const { data: wo } = await supabaseAdmin
    .from("work_orders")
    .select("id, trouble, status, supervisor, supervisor_ids, actual_cost, is_history, assets(name, locations(name))")
    .eq("id", woId)
    .maybeSingle();
  if (!wo) return { sent: 0, failed: 0, errors: [], skipped: "Work Order tidak ditemukan" };
  if (wo.is_history) return { sent: 0, failed: 0, errors: [], skipped: "Work Order riwayat (is_history) tidak mengirim email" };

  const { data: upd } = await supabaseAdmin
    .from("work_order_updates")
    .select("status, keterangan, biaya, update_date, created_at")
    .eq("work_order_id", woId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const supervisorIds: string[] = Array.isArray(wo.supervisor_ids) ? wo.supervisor_ids : [];
  const recipients = await fetchRecipients({ roles: ADMIN_ROLES, ids: supervisorIds });

  const finished = String(wo.status || "").toLowerCase().includes("selesai");
  const html = renderEmail({
    heading: finished ? `Work Order Selesai: ${wo.id}` : `Update Work Order: ${wo.id}`,
    rows: [
      { label: "Aset", value: assetLabel(wo.assets) },
      { label: "Masalah", value: wo.trouble },
      { label: "Status terbaru", value: upd?.status || wo.status },
      { label: "Keterangan", value: upd?.keterangan },
      { label: "Biaya update", value: upd?.biaya ? `Rp ${Number(upd.biaya).toLocaleString("id-ID")}` : "" },
      { label: "Total biaya", value: wo.actual_cost ? `Rp ${Number(wo.actual_cost).toLocaleString("id-ID")}` : "" },
      { label: "Pengawas", value: wo.supervisor },
    ],
    buttonLabel: "Buka Work Order",
    buttonUrl: link(`/pemeliharaan/korektif/${encodeURIComponent(wo.id)}`),
  });

  const res = await send(
    recipients.map((u) => ({
      to: u.email,
      subject: `${finished ? "WO selesai" : "Update WO"} ${wo.id}: ${upd?.status || wo.status || ""}`.trim(),
      html,
    }))
  );
  return {
    ...res,
    debug: {
      supervisor_ids_tersimpan: supervisorIds,
      pengawas: await explainSupervisors(supervisorIds),
      penerima: recipients.map((u) => `${u.name} <${u.email}> [${u.role}]${supervisorIds.includes(u.id) ? " (pengawas)" : ""}`),
    },
  };
}

// ---------------------------------------------------------------------------
// 4. Perbaikan mendadak -> admin + operator (SATU email gabungan)
// ---------------------------------------------------------------------------
export async function notifyEmergencyRepair(woId: string): Promise<SendResult> {
  const { data: wo } = await supabaseAdmin
    .from("work_orders")
    .select("id, tgl, trouble, tech_name, tindak_lanjut, issued_by, is_history, assets(name, locations(name))")
    .eq("id", woId)
    .maybeSingle();
  if (!wo) return { sent: 0, failed: 0, errors: [], skipped: "Work Order tidak ditemukan" };
  if (wo.is_history) return { sent: 0, failed: 0, errors: [], skipped: "Work Order riwayat (is_history) tidak mengirim email" };

  const recipients = await fetchRecipients({ roles: [...ADMIN_ROLES, "operator"] });
  const html = renderEmail({
    heading: "Perbaikan Mendadak",
    intro: "Sebuah perbaikan mendadak baru saja dicatat. Status aset langsung menjadi Perbaikan.",
    rows: [
      { label: "Aset", value: assetLabel(wo.assets) },
      { label: "Kejadian", value: wo.trouble },
      { label: "Keterangan", value: wo.tindak_lanjut },
      { label: "Pelaksana", value: wo.tech_name },
      { label: "Dicatat oleh", value: wo.issued_by },
      { label: "Tanggal", value: wo.tgl },
      { label: "No. WO", value: wo.id },
    ],
    buttonLabel: "Buka Work Order",
    buttonUrl: link(`/pemeliharaan/korektif/${encodeURIComponent(wo.id)}`),
  });
  return send(
    recipients.map((u) => ({ to: u.email, subject: `Perbaikan mendadak: ${wo.trouble || wo.id}`, html }))
  );
}

// ---------------------------------------------------------------------------
// 5. Stok menipis / habis -> admin
// ---------------------------------------------------------------------------
export async function notifyLowStock(itemId: string): Promise<SendResult> {
  const { data: item } = await supabaseAdmin
    .from("stock_items")
    .select("id, name, category, qty, unit, min_stock")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { sent: 0, failed: 0, errors: [], skipped: "Item stok tidak ditemukan" };

  // Kirim hanya kalau benar-benar menipis/habis (mencegah email keliru kalau endpoint dipanggil ulang)
  if (item.qty > item.min_stock) return { sent: 0, failed: 0, errors: [], skipped: "Stok masih aman" };

  const habis = item.qty <= 0;
  const recipients = await fetchRecipients({ roles: ADMIN_ROLES });
  const html = renderEmail({
    heading: habis ? "Stok Habis" : "Stok Menipis",
    intro: habis
      ? "Sebuah item stok sudah habis dan perlu segera diisi ulang."
      : "Sebuah item stok sudah mencapai atau di bawah batas minimum.",
    rows: [
      { label: "Item", value: item.name },
      { label: "Kategori", value: item.category },
      { label: "Stok saat ini", value: `${item.qty} ${item.unit || ""}`.trim() },
      { label: "Batas minimum", value: `${item.min_stock} ${item.unit || ""}`.trim() },
    ],
    buttonLabel: "Buka Stok",
    buttonUrl: link(`/stok/${encodeURIComponent(item.id)}`),
  });
  return send(
    recipients.map((u) => ({
      to: u.email,
      subject: `${habis ? "Stok habis" : "Stok menipis"}: ${item.name}`,
      html,
    }))
  );
}

// ---------------------------------------------------------------------------
// 6. Pengingat pemeliharaan pencegahan (cron 07:00 WITA, hari-H) -> semua operator
// ---------------------------------------------------------------------------
export async function sendMaintenanceReminders(): Promise<SendResult & { date: string; schedules: number }> {
  const today = getWitaDateStr();

  const { data: schedules, error } = await supabaseAdmin
    .from("maintenance_schedules")
    .select("id, scheduled_date, status, assets(name, type, locations(name))")
    .eq("scheduled_date", today)
    .eq("status", "Terjadwal");

  if (error) {
    return { sent: 0, failed: 0, errors: [error.message], date: today, schedules: 0 };
  }
  if (!schedules || schedules.length === 0) {
    return { sent: 0, failed: 0, errors: [], skipped: "Tidak ada jadwal hari ini", date: today, schedules: 0 };
  }

  const recipients = await fetchRecipients({ roles: ["operator"] });

  const rows = schedules.map((s: any, i: number) => ({
    label: `${i + 1}. ${s.assets?.name || "Aset"}`,
    value: [s.assets?.type, s.assets?.locations?.name].filter(Boolean).join(" • ") || "-",
  }));

  const html = renderEmail({
    heading: "Pengingat Pemeliharaan Hari Ini",
    intro: `Ada ${schedules.length} jadwal pemeliharaan pencegahan hari ini (${today}).`,
    rows,
    buttonLabel: "Buka Jadwal Pemeliharaan",
    buttonUrl: link("/pemeliharaan"),
  });

  const res = await send(
    recipients.map((u) => ({
      to: u.email,
      subject: `Pengingat: ${schedules.length} jadwal pemeliharaan hari ini`,
      html,
    }))
  );
  return { ...res, date: today, schedules: schedules.length };
}