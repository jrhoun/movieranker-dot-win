import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The server's privileged Supabase key. Supabase is replacing the legacy
 * `service_role` JWT with opaque secret keys (`sb_secret_…`), which are a
 * drop-in for `createClient` and carry the same `service_role` privileges —
 * so every `grant … to service_role` in the migrations applies to both. The
 * legacy key keeps working until the end of 2026; Supabase's own name for the
 * new one is SUPABASE_SECRET_KEY, so that is read first and the legacy name is
 * the fallback. Set exactly one.
 */
export function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
}

// Privileged client: bypasses RLS. Server-only — never import from client
// components. Powers account deletion (auth.admin.deleteUser) and every write
// to profiles.showcase (see src/lib/profile-showcase-write.ts).
let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  return (admin ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // An empty key fails at the network with an opaque 401; callers that can
    // give a better error check supabaseSecretKey() first.
    supabaseSecretKey() ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  ));
}
