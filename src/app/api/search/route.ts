import { NextRequest, NextResponse } from "next/server";
import {
  discoverByCompany,
  getPersonCredits,
  searchCompany,
  searchMovies,
  searchPerson,
} from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const mode = req.nextUrl.searchParams.get("mode");
  const ref = req.nextUrl.searchParams.get("ref");

  try {
    let results: unknown;
    if (mode === "person") {
      results = await searchPerson(q);
    } else if (mode === "company") {
      results = await searchCompany(q);
    } else if (mode === "keyword") {
      results = await searchMovies(q);
    } else if (mode === "title") {
      results = await searchMovies(q);
    } else if (mode === "person-credits") {
      if (!ref) {
        return NextResponse.json({ error: "ref required for person-credits" }, { status: 400 });
      }
      results = await getPersonCredits(Number(ref));
    } else if (mode === "company-discover") {
      if (!ref) {
        return NextResponse.json({ error: "ref required for company-discover" }, { status: 400 });
      }
      results = await discoverByCompany(Number(ref));
    } else {
      return NextResponse.json({ error: `unknown mode: ${mode}` }, { status: 400 });
    }
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "upstream tmdb request failed" }, { status: 502 });
  }
}
