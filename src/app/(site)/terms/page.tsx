import type { Metadata } from "next";
import MarqueeHeading from "@/components/MarqueeHeading";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service · movieranker.win" };

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-3 font-display text-xl uppercase tracking-[0.12em] text-gold">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:max-w-2xl">
      <MarqueeHeading>Terms of Service</MarqueeHeading>
      <div className="mt-6 rounded-xl bg-surface p-6 ring-1 ring-white/10 sm:p-8">
        <div className="space-y-4 text-sm leading-relaxed text-text">
          <p className="text-xs uppercase tracking-wider text-muted">
            Last updated: August 2026
          </p>

          <p>
            Welcome to movieranker.win (&ldquo;the Service&rdquo;). By accessing or using the Service, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, please do not use the Service.
          </p>

          <H2>1. Eligibility</H2>
          <p>
            You must be at least 13 years old to use the Service. If the laws of your jurisdiction require that you be older to legally consent to online services, you must meet that minimum age requirement.
          </p>

          <H2>2. Acceptable Use & Conduct</H2>
          <p>
            You agree to use the Service only for lawful, personal purposes. You agree not to:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Post, submit, or transmit any illegal, defamatory, harassing, hateful, or abusive content in list titles, descriptions, or participant names.</li>
            <li>Attempt to interfere with, compromise the system integrity of, or decipher any transmissions to or from the servers running the Service.</li>
            <li>Use automated means (such as bots, scrapers, or scripts) to access or harvest data from the Service without express written permission.</li>
          </ul>
          <p>
            We reserve the right to remove content, terminate sessions, or suspend accounts that violate these rules.
          </p>

          <H2>3. Your Content & Intellectual Property</H2>
          <p>
            You retain all ownership rights to the lists, custom titles, descriptions, and participant rankings you create using the Service. By creating or submitting content, you grant movieranker.win a worldwide, non-exclusive, royalty-free license to host, store, display, format, and share that content solely for the purpose of operating and providing the Service.
          </p>

          <H2>4. Movie Metadata & Poster Artwork (TMDB)</H2>
          <p>
            Movie titles, synopses, release dates, and poster artwork are provided courtesy of The Movie Database (TMDB) API. This product uses the TMDB API but is not endorsed, certified, or sponsored by TMDB. Poster images and trademarked film materials belong to their respective copyright holders.
          </p>

          <H2>5. Copyright & DMCA Notice</H2>
          <p>
            If you believe that any material on or accessible through the Service infringes your copyright, please send a written notification of copyright infringement with sufficient detail to our contact address at <span className="font-mono text-gold">{CONTACT_EMAIL}</span> so we can take appropriate action.
          </p>

          <H2>6. Disclaimer of Warranties</H2>
          <p>
            The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express, implied, or statutory, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance. We do not warrant that the Service will function uninterrupted, secure, or bug-free.
          </p>

          <H2>7. Limitation of Liability</H2>
          <p>
            To the maximum extent permitted by applicable law, in no event shall movieranker.win, its creator, operators, or service providers be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data or goodwill, arising out of or in connection with your access to or use of (or inability to access or use) the Service.
          </p>

          <H2>8. Governing Law & Jurisdiction</H2>
          <p>
            These Terms and any dispute or claim arising out of or related to them, their subject matter, or your use of the Service shall be governed by and construed in accordance with the laws of the State of Texas, United States, without giving effect to any choice or conflict of law principles. Any legal action or proceeding arising out of or related to these Terms or the Service shall be instituted exclusively in the state or federal courts located in Texas, and you consent to the personal jurisdiction of such courts.
          </p>

          <H2>9. Changes to Terms</H2>
          <p>
            We may revise and update these Terms from time to time. Any changes will be posted directly on this page with an updated effective date. Your continued use of the Service following the posting of revised Terms constitutes your acceptance of the changes.
          </p>

          <H2>10. Contact Us</H2>
          <p>
            If you have any questions or concerns regarding these Terms, please contact us by email at <span className="font-mono text-gold">{CONTACT_EMAIL}</span>.
          </p>
        </div>
      </div>
    </main>
  );
}
