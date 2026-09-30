// lib/email.ts
//
// Pengirim email via Resend (REST API, tanpa SDK -> tidak perlu `npm install` apa pun).
// HANYA boleh diimport dari server (API route / cron). API key tidak boleh sampai ke browser.
//
// Environment variable (Vercel):
//   RESEND_API_KEY          (wajib)  API key dari resend.com
//   RESEND_FROM_EMAIL       (opsional) mis. "Inu Asset <notif@domainmu.com>".
//                           Default: "Inu Asset <onboarding@resend.dev>" (mode testing gratis:
//                           Resend hanya mau mengirim ke email akun Resend kamu sendiri).
//   EMAIL_TEST_OVERRIDE_TO  (opsional) kalau diisi, SEMUA email dialihkan ke alamat ini
//                           (subjek diberi tanda penerima aslinya). Untuk testing satu inbox.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface SendResult {
  sent: number;
  failed: number;
  skipped?: string;
  errors: string[];
}

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const DEFAULT_FROM = "Inu Asset <onboarding@resend.dev>";

export async function sendEmails(messages: EmailMessage[]): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  if (messages.length === 0) return result;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY belum diset -> email dilewati.");
    result.skipped = "RESEND_API_KEY belum diset";
    return result;
  }

  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  const override = process.env.EMAIL_TEST_OVERRIDE_TO?.trim();

  let outgoing = messages.map((m) => ({
    from,
    to: [m.to],
    subject: m.subject,
    html: m.html,
  }));

  if (override) {
    outgoing = messages.map((m) => ({
      from,
      to: [override],
      subject: `[TEST → ${m.to}] ${m.subject}`,
      html: m.html,
    }));
  }

  // Resend batch: maksimal 100 email per permintaan
  for (let i = 0; i < outgoing.length; i += 100) {
    const chunk = outgoing.slice(i, i + 100);
    try {
      const res = await fetch(RESEND_BATCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (res.ok) {
        result.sent += chunk.length;
      } else {
        const text = await res.text();
        result.failed += chunk.length;
        result.errors.push(`Resend ${res.status}: ${text}`);
        console.error("[email] Resend menolak:", res.status, text);
      }
    } catch (err: any) {
      result.failed += chunk.length;
      result.errors.push(err?.message || "Gagal menghubungi Resend");
      console.error("[email] Gagal menghubungi Resend:", err);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Template HTML sederhana (inline style supaya tampil baik di semua email client)
// ---------------------------------------------------------------------------
export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailLayoutOptions {
  heading: string;
  intro?: string;
  rows: { label: string; value: unknown }[];
  note?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

export function renderEmail(o: EmailLayoutOptions): string {
  const rows = o.rows
    .filter((r) => r.value !== null && r.value !== undefined && String(r.value).trim() !== "")
    .map(
      (r) =>
        `<tr><td style="padding:8px 12px;color:#64748B;font-size:13px;width:150px;vertical-align:top;border-bottom:1px solid #F1F5F9">${escapeHtml(
          r.label
        )}</td><td style="padding:8px 12px;color:#0F172A;font-size:14px;font-weight:600;border-bottom:1px solid #F1F5F9">${escapeHtml(
          r.value
        ).replace(/\n/g, "<br/>")}</td></tr>`
    )
    .join("");

  const button =
    o.buttonUrl && o.buttonLabel
      ? `<p style="margin:24px 0 0"><a href="${escapeHtml(
          o.buttonUrl
        )}" style="background:#0D9488;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block">${escapeHtml(
          o.buttonLabel
        )}</a></p>`
      : "";

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;color:#0D9488;font-size:12px;font-weight:700;letter-spacing:1px">INU ASSET</p>
<h2 style="margin:0 0 12px;color:#0F172A;font-size:18px">${escapeHtml(o.heading)}</h2>
${o.intro ? `<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5">${escapeHtml(o.intro)}</p>` : ""}
<table style="width:100%;border-collapse:collapse">${rows}</table>
${o.note ? `<p style="margin:16px 0 0;color:#0F172A;font-size:13px;background:#F0FDFA;border-radius:8px;padding:10px 12px">${escapeHtml(o.note)}</p>` : ""}
${button}
<p style="margin:24px 0 0;color:#94A3B8;font-size:11px">Email otomatis dari Inu Asset. Anda bisa mematikan notifikasi email di Pengaturan → Notifikasi.</p>
</div></body></html>`;
}