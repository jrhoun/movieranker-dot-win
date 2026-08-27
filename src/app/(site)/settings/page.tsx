import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
  title: "Account Settings · movieranker.win",
  description: "Manage your movieranker.win identity, authentication email, data exports, and account settings.",
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle,visibility")
    .eq("id", auth.user.id)
    .maybeSingle<{ handle: string | null; visibility: string | null }>();

  const claimed = profile != null;
  const handle = profile?.handle ?? null;
  const initialVisibility = profile?.visibility === "public" ? "public" : "private";

  // Provider detection (Google OAuth vs Email/Password)
  const appMetadata = auth.user.app_metadata as Record<string, unknown> | undefined;
  const provider = (appMetadata?.provider as string) ||
    (Array.isArray(appMetadata?.providers) && appMetadata.providers.includes("google") ? "google" : "email");
  const email = auth.user.email ?? "";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Link
          href="/u/profile"
          className="text-xs text-muted hover:text-gold transition-colors flex items-center gap-1 font-medium"
        >
          ← Back to Profile &amp; Lists
        </Link>
      </div>

      <MarqueeHeading>Account Settings</MarqueeHeading>
      <p className="mt-1 text-xs text-muted sm:text-sm">
        Configure your public handle, sign-in methods, list data exports, and account management.
      </p>

      <SettingsClient
        initialEmail={email}
        provider={provider}
        handle={handle}
        initialVisibility={initialVisibility}
        claimed={claimed}
      />
    </main>
  );
}
