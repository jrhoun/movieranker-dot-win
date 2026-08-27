import type { Metadata } from "next";
import MarqueeHeading from "@/components/MarqueeHeading";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CompareHubClient from "./compare-client";

export const metadata: Metadata = {
  title: "Compare Rankings · movieranker.win",
  description: "Compare two movie rankings head-to-head to see where you agree, disagree, and collide.",
};

export default async function CompareHubPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  let myLists: { id: string; title: string }[] = [];
  if (data.user) {
    const { data: lists } = await supabase
      .from("lists")
      .select("id,title")
      .eq("owner_id", data.user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(10);
    myLists = (lists ?? []) as { id: string; title: string }[];
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl">
      <MarqueeHeading>Compare Rankings</MarqueeHeading>
      <p className="mt-2 text-sm text-muted">
        Put two rankings side-by-side to see how your movie tastes line up, where your opinions collide, and calculate your compatibility score.
      </p>
      <CompareHubClient myLists={myLists} />
    </main>
  );
}
