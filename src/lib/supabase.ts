import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pjgxzkjgxhfbcbbockyk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yEjC6CiM3rKmfVp8GwkV0g_cXjysTSB";

// Use a single, explicit storage key so signOut can reliably wipe it and
// nothing else writes a competing entry. Avoids stale sessions resurrecting
// after sign-out.
export const SUPABASE_AUTH_STORAGE_KEY = "sb-pjgxzkjgxhfbcbbockyk-auth-token";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});