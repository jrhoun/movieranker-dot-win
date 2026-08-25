import type { Metadata } from "next";
import MarqueeHeading from "@/components/MarqueeHeading";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy · movieranker.win" };

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-2 font-display text-xl uppercase tracking-[0.12em] text-gold">
      {children}
    </h2>
  );
}

// Plain-language policy describing what this app actually stores. Template
// quality, not legal advice — have it reviewed before treating it as binding.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>Privacy</MarqueeHeading>
      <div className="mt-6 rounded bg-surface p-6 ring-1 ring-white/10 sm:p-8">
        <div className="space-y-4 text-sm leading-relaxed text-text">
          <p>
            Short version: we store what you need for the game to work, we don’t
            track you, and you can delete everything at any time.
          </p>

          <H2>What we store</H2>
          <p>
            Your account email, plus whatever you type into the app: list titles
            and descriptions, participant names, the movies you pick, and your
            ranking votes. Votes are aggregated into Elo-style scores that make
            up your ranked list. We store nothing else.
          </p>

          <H2>Who can use the site</H2>
          <p>
            You must be at least 13 to use movieranker.win. Some countries
            require you to be 16 — if that’s where you live, please wait until
            then.
          </p>

          <H2>How long we keep it</H2>
          <p>
            Your account data is kept until you delete your account. Deletion
            is immediate and permanent — there’s no archive and no grace
            period.
          </p>

          <H2>Cookies and local storage</H2>
          <p>
            The site sets exactly one cookie: your Supabase sign-in session.
            It’s strictly necessary — without it you couldn’t stay logged in.
            There are no tracking, analytics, or advertising cookies of any
            kind. While you’re mid-game, your in-progress rankings live in your
            browser’s local storage so a refresh doesn’t lose them.
          </p>

          <H2>Third parties</H2>
          <p>
            Two services process your data to make the site work: Supabase
            (hosts the database and your sign-in on servers in the EU/US, and
            handles authentication) and TMDB (supplies movie metadata and
            poster images). We don’t share your data with anyone else, and we
            never sell it.
          </p>

          <H2>Your rights</H2>
          <p>
            You can export all of your lists as JSON any time from My Lists.
            You can also delete your account there — this permanently erases
            your account and every list you’ve made, immediately. Questions?
            Email{" "}
            {/* TODO: replace [CONTACT] placeholder before launch */}
            <span className="text-muted">{CONTACT_EMAIL}</span>.
          </p>
        </div>
      </div>
    </main>
  );
}
