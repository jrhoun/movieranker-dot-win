import type { Metadata } from "next";
import MarqueeHeading from "@/components/MarqueeHeading";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms · movieranker.win" };

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-2 font-display text-xl uppercase tracking-[0.12em] text-gold">
      {children}
    </h2>
  );
}

// Plain-language terms. Template quality, not legal advice — have it reviewed
// before treating it as binding.
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>Terms</MarqueeHeading>
      <div className="mt-6 rounded bg-surface p-6 ring-1 ring-white/10 sm:p-8">
        <div className="space-y-4 text-sm leading-relaxed text-text">
          <p>
            Be decent. Don’t put illegal or hateful content in participant names
            or list descriptions, and don’t use the site to harass anyone. We
            may remove content or suspend accounts that abuse the service.
          </p>

          <H2>No warranty</H2>
          <p>
            The service is provided as-is, without warranty of any kind. It may
            have bugs, change, or go away. Your lists are yours; export them if
            you want a backup.
          </p>

          <H2>Your content</H2>
          <p>
            You own your lists. By submitting titles, descriptions, participant
            names, and rankings you give movieranker.win a non-exclusive,
            worldwide license to display them — solely for operating the
            service. Nothing more.
          </p>

          <H2>Movies & posters</H2>
          <p>
            Movie titles, metadata, and poster images are courtesy of TMDB, but
            this site is not endorsed by or affiliated with TMDB. Poster art is
            served via TMDB under their terms. If you believe content here
            infringes your copyright, email{" "}
            {/* TODO: replace [CONTACT] placeholder before launch */}
            <span className="text-muted">{CONTACT_EMAIL}</span>.
          </p>

          <H2>Governing law</H2>
          <p>
            These terms are governed by the laws of the State of Texas, USA.
            Disputes are handled in the courts of Texas.
          </p>

          <H2>Contact</H2>
          <p>
            Questions about these terms? Email{" "}
            {/* TODO: replace [CONTACT] placeholder before launch */}
            <span className="text-muted">{CONTACT_EMAIL}</span>.
          </p>
        </div>
      </div>
    </main>
  );
}
