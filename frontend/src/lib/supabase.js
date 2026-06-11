import { createClient } from "@supabase/supabase-js";

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase =
  URL && KEY
    ? createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

export const isSupabaseEnabled = !!supabase;
