import { createClient } from "@supabase/supabase-js";

const URL = "https://fdlbarxvdtifawunvndz.supabase.co";
const KEY = "sb_publishable_IIaedv182GTrEvFdufEMoA_V-L9iZv5";

export const isSupabaseEnabled = Boolean(URL && KEY);

export const supabase = isSupabaseEnabled
  ? createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;