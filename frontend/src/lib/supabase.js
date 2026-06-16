import { createClient } from "@supabase/supabase-js";

const URL = "https://fdlbarxvdtifawunvndz.supabase.co";

const KEY = "sb_publishable_IIaedv182GTrEvFdufEMoA_V-L9iZv5";

export const supabase = createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseEnabled = true;

console.log("Supabase connected:", Boolean(supabase));