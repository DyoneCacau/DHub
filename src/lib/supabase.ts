import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "@/config/env";

const env = requireEnv();

/**
 * Cliente único do browser.
 * Usa apenas URL + publishable key. Nunca service_role / sb_secret.
 * Tipagem de tabelas: `src/types/database.ts` (mínima). Geração oficial depois do link remoto.
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
