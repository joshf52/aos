import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Privileged Supabase client for trusted server code (cron jobs, webhooks,
 * AI build status writes). It bypasses RLS, so every caller must check who
 * the signed-in user is, and that they own the rows involved, before using it.
 *
 * Key: SUPABASE_SECRET_KEY (a Supabase `sb_secret_...` key, individually
 * revocable) is preferred; SUPABASE_SERVICE_ROLE_KEY (the legacy JWT, which
 * Supabase is retiring by the end of 2026) is the fallback. Neither may ever
 * carry a NEXT_PUBLIC_ prefix.
 *
 * Each call returns a fresh client with no session storage, so a privileged
 * client is never shared with, or confused for, the cookie-bound SSR client.
 * `import "server-only"` makes any client-component import a build error.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY");
  }
  // A misconfigured deployment that put the public key here would silently
  // downgrade every privileged write to an anonymous one (or worse, the
  // reverse mistake would ship the secret to browsers). Refuse both shapes.
  if (key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || key.startsWith("sb_publishable_")) {
    throw new Error("The Supabase service key is set to the public key. Use the secret key.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
