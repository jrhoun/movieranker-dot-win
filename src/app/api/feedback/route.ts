import { NextResponse } from "next/server";
import { LIMITS, rateKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { category, message, email } = body as Record<string, unknown>;

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

  // Optional Supabase persistence fallback (non-blocking if table is missing)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createSupabaseServerClient();
      await supabase.from("feedback").insert({
        category: normalizedCategory,
        message: trimmedMessage,
        email: validatedEmail,
        created_at: new Date().toISOString(),
      });
    }
  } catch {
    // Fallback gracefully without breaking submission if Supabase table or cookie is unavailable
  }

  return NextResponse.json({ ok: true });
}
