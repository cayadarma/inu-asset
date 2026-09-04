// Cara pakai:
//   node scripts/generate-password-hash.mjs "passwordKamu"
// Hasil hash-nya tempel ke kolom password_hash di tabel `users` (SQL Editor Supabase).

import bcrypt from "bcryptjs";

const plain = process.argv[2];

if (!plain) {
  console.error("Cara pakai: node scripts/generate-password-hash.mjs \"passwordKamu\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 10);
console.log("\nPassword :", plain);
console.log("Hash     :", hash);
console.log("\nContoh SQL:");
console.log(
  `update public.users set password_hash = '${hash}' where username = 'admin';`
);
