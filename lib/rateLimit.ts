// KHUSUS SERVER. Pembatas jumlah permintaan sederhana (per user, per jendela waktu).
//
// Catatan jujur: ini disimpan di memori server. Di Vercel (serverless) tiap
// "instance" server punya memori sendiri, jadi batasnya tidak ketat 100%.
// Fungsinya sebagai pengaman dasar supaya satu akun tidak bisa membanjiri
// email atau kuota terjemahan; bukan pengganti pembatas level jaringan.
const buckets = new Map<string, { count: number; resetAt: number }>();

// Mengembalikan true kalau permintaan masih boleh, false kalau sudah melewati batas.
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  // Bersihkan entri kedaluwarsa kalau sudah menumpuk
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;

  bucket.count += 1;
  return true;
}