import { NextResponse } from "next/server";
import { LIMITS, rateKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VALID_CATEGORIES = new Set(["bug", "idea", "other"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // Rate limit by IP or user
  const rl = rateLimit(
    await rateKey("feedback", request),
    LIMITS.feedback,
  );
  if (!rl.ok) {
    return tooManyRequests(
      rl.retryAfterSeconds,
      "Too many feedback submissions. Please try again later.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be an object" },
      { status: 400 },
    );
  }

  const rawBody = body as Record<string, unknown>;
  const honeypot = rawBody.hp_website ?? rawBody.website;
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    // Honeypot triggered: silently drop spam submission without persisting
    console.info("[feedback] Honeypot triggered, dropping submission");
    return NextResponse.json({ ok: true });
  }

  const { category, message, email } = rawBody;

  // Category validation
  if (typeof category !== "string") {
    return NextResponse.json(
      { error: "Category is required and must be a string" },
      { status: 400 },
    );
  }
  const normalizedCategory = category.trim().toLowerCase();
  if (!VALID_CATEGORIES.has(normalizedCategory)) {
    return NextResponse.json(
      { error: "Invalid category. Must be one of: bug, idea, other" },
      { status: 400 },
    );
  }

  // Message validation
  if (typeof message !== "string") {
    return NextResponse.json(
      { error: "Message is required and must be a string" },
      { status: 400 },
    );
  }
  const trimmedMessage = message.trim();
  if (trimmedMessage.length < 1 || trimmedMessage.length > 2000) {
    return NextResponse.json(
      { error: "Message must be between 1 and 2000 characters" },
      { status: 400 },
    );
  }

  // Email validation (optional)
  let validatedEmail: string | null = null;
  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string") {
      return NextResponse.json(
        { error: "Email must be a string if provided" },
        { status: 400 },
      );
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail.length > 320) {
      return NextResponse.json(
        { error: "Email must not exceed 320 characters" },
        { status: 400 },
      );
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }
    validatedEmail = trimmedEmail;
  }

  // Page URL validation (optional, from body.pageUrl or body.page_url)
  const rawPageUrl =
    (body as Record<string, unknown>).pageUrl ??
    (body as Record<string, unknown>).page_url;
  let pageUrl: string | null = null;
  if (rawPageUrl !== undefined && rawPageUrl !== null && rawPageUrl !== "") {
    if (typeof rawPageUrl !== "string") {
      return NextResponse.json(
        { error: "pageUrl must be a string if provided" },
        { status: 400 },
      );
    }
    const trimmedPageUrl = rawPageUrl.trim();
    if (trimmedPageUrl.length > 2048) {
      return NextResponse.json(
        { error: "pageUrl must not exceed 2048 characters" },
        { status: 400 },
      );
    }
    pageUrl = trimmedPageUrl || null;
  }

  // Structured logging
  console.info(
    "[feedback]",
    JSON.stringify({
      category: normalizedCategory,
      messageLength: trimmedMessage.length,
      hasEmail: Boolean(validatedEmail),
      timestamp: new Date().toISOString(),
    }),
  );

  // Authenticated user if signed in
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  // User-Agent header
  const userAgent = request.headers.get("user-agent") ?? null;

  // Persist via service-role admin client (RLS on, no anon policies)
  try {
    const db = supabaseAdmin();
    const { error } = await db.from("feedback").insert({
      category: normalizedCategory,
      message: trimmedMessage,
      email: validatedEmail,
      user_id: userId,
      page_url: pageUrl,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[feedback] Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[feedback] Supabase admin error:", err);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
