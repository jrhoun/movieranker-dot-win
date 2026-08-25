import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Server-only — never import from client
// components. Powers account deletion (auth.admin.deleteUser).
let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  return (admin ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // ponytail: throws at call time if unset; fine because deletion is opt-in UI.
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  ));
}
