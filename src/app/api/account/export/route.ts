import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse } from "@/lib/lists-api";

// Full export of the caller's lists. RLS scopes rows to the owner.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: lists, error } = await supabase
    .from("lists")
    .select("*,list_movies(*)");
  if (error) return dbErrorResponse(error);

  const body = JSON.stringify({
    exported_at: new Date().toISOString(),
    lists: lists ?? [],
  });
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="movieranker-lists.json"',
    },
  });
}
