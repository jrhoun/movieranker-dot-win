import { notFound } from "next/navigation";
import { fetchResumableList } from "@/lib/lists-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PlayRoom from "./play-room";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) return <PlayRoom />;

  // RLS makes "not yours" and "missing" the same lookup; either way -> 404.
  // (/l/<id> detail page arrives in a later task.)
  const initial = await fetchResumableList(await createSupabaseServerClient(), id);
  if (!initial) notFound();

  return <PlayRoom initial={initial} />;
}
