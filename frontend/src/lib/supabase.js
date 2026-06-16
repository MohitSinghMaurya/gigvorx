import { createClient } from "@supabase/supabase-js";

const URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.REACT_APP_SUPABASE_URL;

const KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase =
  URL && KEY
    ? createClient(URL, KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSupabaseEnabled = Boolean(supabase);

if (!supabase) {
  console.warn(
    "Supabase is not enabled. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
  );
}
