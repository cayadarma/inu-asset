// Aturan password yang dipakai di server (API) dan di form (browser).
// Mau ubah panjang minimal? Cukup ubah angka di bawah ini.
// Catatan: Supabase Auth punya pengaturan minimal password sendiri
// (Authentication -> Sign In / Providers -> Email). Angkanya jangan lebih
// rendah dari angka di sini; kalau nanti angka di sini dinaikkan, naikkan juga di sana.
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72; // batas bawaan bcrypt/Supabase

// Password yang sangat umum dan paling dulu ditebak penyerang
const COMMON_WEAK_PASSWORDS = new Set([
  "123456", "1234567", "12345678", "123456789", "1234567890", "654321",
  "111111", "000000", "123123", "121212", "112233", "123321",
  "password", "password1", "password123", "passw0rd",
  "qwerty", "qwerty123", "qwertyuiop", "abc123", "abcdef", "abcd1234",
  "admin", "admin123", "administrator", "operator", "manajemen",
  "inuasset", "inu-asset", "inu123", "itdc123", "itdc",
  "letmein", "welcome", "iloveyou", "rahasia", "sandi", "katasandi",
]);

// Mengembalikan pesan error (string) kalau password ditolak, atau null kalau aman.
export function validatePassword(password: string, username?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password maksimal ${MAX_PASSWORD_LENGTH} karakter.`;
  }

  const lower = password.toLowerCase();

  if (COMMON_WEAK_PASSWORDS.has(lower)) {
    return "Password terlalu mudah ditebak. Gunakan kombinasi lain.";
  }
  if (username && lower === username.trim().toLowerCase()) {
    return "Password tidak boleh sama dengan username.";
  }
  if (/^(.)\1+$/.test(password)) {
    return "Password tidak boleh hanya satu karakter yang diulang.";
  }

  return null;
}