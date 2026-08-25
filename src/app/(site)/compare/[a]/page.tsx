import { notFound } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import ComparePicker from "@/components/ComparePicker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canCompare } from "@/lib/versus";

/** /compare/[listId] — picker step: paste a second list to compare against. */
export default async function ComparePickerPage({
  params,
}: {
  params: Promise<{ a: string }>;
}) {
  const { a } = await params;
  const supabase = await createSupabaseServerClient();

  // Confirm the anchor list exists and is viewer-readable before showing the
  // form; otherwise the picker would happily build dead compare URLs.
  const { data: list } = await supabase
    .from("lists")
    .select("id,title,status,visibility,owner_id")
    .eq("id", a)
    .maybeSingle<{
      id: string;
      title: string;
      status: string;
      visibility: string | null;
      owner_id: string;
    }>();
  // The anchor list must itself be comparable (finished + viewer-readable);
  // otherwise the picker would happily build dead compare URLs.
  const user = (await supabase.auth.getUser()).data.user;
  if (!list || !canCompare({ ...list, ownerId: list.owner_id }, user?.id ?? null))
    notFound();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl">
      <MarqueeHeading as="h2">Versus</MarqueeHeading>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
        Pick a second ranking to put next to{" "}
        <span className="font-semibold text-text">{list.title}</span> — see how
        your orders line up, where they collide, and how compatible you really
        are.
      </p>
      <ComparePicker listId={a} />
      <p className="mt-4 text-xs text-muted">
        Any finished ranking you can open works — public lists, or unlisted ones
        shared with you by link.
      </p>
    </main>
  );
}
