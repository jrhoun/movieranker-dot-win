import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MovieRanker – Head-to-Head Film Tournaments & Rankings",
  description:
    "Rank movies head-to-head, solo or with friends. A new six-film Marquee every week with a hidden connection. For people who love lists and movies.",
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d10",
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        {gaId && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}', {
                    page_path: window.location.pathname,
                    allow_google_signals: false,
                    allow_ad_personalization_signals: false,
                    anonymize_ip: true,
                  });
                `,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
