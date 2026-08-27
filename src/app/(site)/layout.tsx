import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthToast from "@/components/AuthToast";
import ReferralTracker from "@/components/ReferralTracker";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={null}>
        <AuthToast />
        <ReferralTracker />
      </Suspense>
      {children}
      <SiteFooter />
    </>
  );
}
