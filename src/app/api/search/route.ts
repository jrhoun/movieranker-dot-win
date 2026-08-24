import { NextRequest, NextResponse } from "next/server";
import {
  discoverByCompany,
  getPersonCredits,
  searchByKeyword,
  searchCompany,
  searchMovies,
  searchPerson,
} from "@/lib/tmdb";

const Q_MODES = ["person", "company", "keyword", "title"];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const mode = req.nextUrl.searchParams.get("mode");
  const ref = req.nextUrl.searchParams.get("ref");

  if ((Q_MODES as string[]).includes(mode ?? "") && !q.trim()) {
    return NextResponse.json({ error: "q required" }, { status: 400 });
  }

  try {
    let results: unknown;
    if (mode === "person") {
      results = await searchPerson(q);
    } else if (mode === "company") {
      results = await searchCompany(q);
    } else if (mode === "keyword") {
      results = await searchByKeyword(q);
    } else if (mode === "title") {
      results = await searchMovies(q);
    } else if (mode === "person-credits") {
      const id = Number(ref);
      if (!ref || !Number.isInteger(id)) {
        return NextResponse.json({ error: "numeric ref required for person-credits" }, { status: 400 });
      }
      results = await getPersonCredits(id);
    } else if (mode === "company-discover") {
      const id = Number(ref);
      if (!ref || !Number.isInteger(id)) {
        return NextResponse.json({ error: "numeric ref required for company-discover" }, { status: 400 });
      }
      results = await discoverByCompany(id);
    } else {
      return NextResponse.json({ error: `unknown mode: ${mode}` }, { status: 400 });
    }
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "upstream tmdb request failed" }, { status: 502 });
  }
}
