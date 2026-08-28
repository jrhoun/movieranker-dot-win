import type { Metadata } from "next";
import MarqueeHeading from "@/components/MarqueeHeading";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy · MovieRanker" };

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-3 font-display text-xl uppercase tracking-[0.12em] text-gold">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>Privacy Policy</MarqueeHeading>
      <div className="mt-6 rounded-xl bg-surface p-6 ring-1 ring-white/10 sm:p-8">
        <div className="space-y-4 text-sm leading-relaxed text-text">
          <p className="text-xs uppercase tracking-wider text-muted">
            Last updated: August 2026
          </p>

          <p>
            At MovieRanker (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), we respect your privacy. This Privacy Policy explains what information we collect when you use our service, why we collect it, and how you can manage or delete your data.
          </p>

          <H2>1. Information We Collect</H2>
          <p>
            We collect only the minimum data necessary to provide and operate the service:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li><strong>Account Information:</strong> When you sign in, we receive and store your email address and optional public username/handle.</li>
            <li><strong>User Content:</strong> List titles, descriptions, participant names, selected movie IDs, and head-to-head vote results you submit.</li>
            <li><strong>Session State:</strong> While playing locally, in-progress ranking sessions are stored in your browser&apos;s local storage to prevent data loss on page refresh.</li>
          </ul>

          <H2>2. Cookies &amp; Local Storage</H2>
          <p>
            We use strictly necessary authentication cookies to maintain your login session, and lightweight local storage to save your in-progress rankings. We do not sell your data or use cross-site behavioral advertising cookies.
          </p>

          <H2>3. Third-Party Services &amp; Analytics</H2>
          <p>
            We rely on trusted third-party providers to operate and improve MovieRanker:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-muted">
            <li><strong>Supabase:</strong> Provides managed database hosting, user authentication, and API infrastructure.</li>
            <li><strong>The Movie Database (TMDB):</strong> Provides movie metadata, descriptions, release years, and poster images.</li>
            <li><strong>Vercel Analytics:</strong> Provides privacy-friendly, cookie-free telemetry on page speed and aggregated site traffic without collecting personal identifiable information.</li>
            <li><strong>Google Analytics (GA4):</strong> Collects aggregated, non-personalized metrics (such as page views and general geographic regions) to help us understand which features are popular. Advertising features and cross-site tracking are disabled.</li>
          </ul>
          <p>
            We do not sell, rent, or monetize your personal information.
          </p>

          <H2>4. Data Retention & Deletion</H2>
          <p>
            Your account data and saved lists are stored until you choose to delete them. You may export all your rankings as JSON at any time from your account settings. You can also delete your account permanently with immediate effect, erasing all associated lists and personal data.
          </p>

          <H2>5. Children&apos;s Privacy</H2>
          <p>
            The service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
          </p>

          <H2>6. Contact & Data Requests</H2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us by email at <span className="font-mono text-gold">{CONTACT_EMAIL}</span>.
          </p>
        </div>
      </div>
    </main>
  );
}
