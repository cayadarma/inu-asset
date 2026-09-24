import { createClient } from "@supabase/supabase-js";

// Client ini HANYA boleh dipakai di server (API routes / server actions),
// jangan pernah diimport dari komponen "use client".
// Menggunakan service role key supaya bisa insert ke tabel `translations`
// meskipun RLS tidak mengizinkan insert dari anon key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});