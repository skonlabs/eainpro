import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pjgxzkjgxhfbcbbockyk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yEjC6CiM3rKmfVp8GwkV0g_cXjysTSB";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});