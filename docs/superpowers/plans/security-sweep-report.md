# Security Sweep Report — movieranker.win v1

Date: 2026 (pre-launch sweep, branch `master`)
Method: static source review of all routes/pages/libs + live probes against the local dev server (`http://localhost:3000`). No destructive payloads; localhost only.

## Findings

| # | Severity | Area | Finding | Evidence | Fix sketch | Status |
|---|----------|------|---------|----------|------------|--------|
| 1 | **High** | Account deletion / data integrity | `shortlist_proposals.proposer_id` FK has no `ON DELETE` action, so `auth.admin.deleteUser()` fails with an FK violation for any user who has proposed a theme — and by then their lists are already deleted. Partial deletion + 500. | `supabase/schema.sql` (`proposer_id uuid references auth.users(id)`); `src/app/api/account/delete/route.ts` deletes lists before the admin call | Clear own proposals first via RLS-scoped delete, then lists, then deleteUser | **Fixed** — commit `131b042`, test updated |
| 2 | **Medium** | Abuse vector | `/api/search` is unauthenticated and rate-limit-free — an open proxy to TMDB that can burn the API quota (all other write routes are limited). | `src/app/api/search/route.ts`: no `rateLimit` call, no auth check | Add IP-keyed `rateLimit` from `@/lib/rate-limit` (e.g. 30/min/IP). Note: in-memory limiter resets per instance (already marked `ponytail:` in rate-limit.ts) | Recommended |
| 3 | **Low** | Storage abuse | POST/PATCH `/api/lists` cap description (1000 chars) but not `title`, `participants` length/count, or `movies` array size — a signed-in user can store multi-MB payloads. | `src/app/api/lists/route.ts` validation block | Cap title ≤120, participants ≤20×50 chars, movies ≤200 entries | Recommended |
| 4 | **Low** | Info leak | `dbErrorResponse` returns raw Supabase/PostgREST `error.message` on 500s (schema/table details can leak). | `src/lib/lists-api.ts` `dbErrorResponse` | Return generic `"internal error"` on non-RLS failures, log the detail server-side | Recommended |
| 5 | **Low** | Headers | No security headers at all: no CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options: nosniff`, HSTS, or `Referrer-Policy` on any response (verified live with `curl -I`). React escaping covers XSS today; CSP is defense-in-depth. | `curl -sI localhost:3000/` → none present; `next.config.ts` has no headers config | Add `headers()` in `next.config.ts` (nosniff + frame-ancestors 'self' minimum, HSTS at the host/proxy, CSP once inline scripts are audited) | Recommended (needs deploy to verify) |
| 6 | **Info** | Host header trust | `shareUrl` in `/l/[id]` builds share links from `x-forwarded-host` when `NEXT_PUBLIC_SITE_URL` is unset — behind a misconfigured proxy an attacker-controlled XFH poisons the copied share URL (same-origin reflection only; no redirect). | `src/app/(site)/l/[id]/page.tsx` | Set `NEXT_PUBLIC_SITE_URL` in production (already supported) | Informational |
| 7 | **Info** | Enumeration (by design) | Profiles RLS policy "read any" means handle existence/enumeration is public. Intentional for public profiles; handles are validated/reserved/profanity-filtered. | `supabase/schema.sql` profiles policies; `GET /api/profile/availability` returns availability to any authenticated user | Accept as designed; revisit if handles ever carry identity beyond display names | Accepted risk |
| 8 | **Info** | Account enumeration | Login page falls back from `signInWithPassword` to `signUp`; Supabase's "user already registered" signup error reveals account existence. Standard trade-off of passwordless-onboarding UX. | `src/app/(site)/login/page.tsx` `handlePassword` | Enable Supabase email-enumeration protection / always respond with generic messaging if it matters | Accepted risk |
| 9 | **Info** | Rate limiting | `rateKey` falls back to `x-forwarded-for` (spoofable) for unauthenticated callers. Currently unreachable — every limited route requires auth first. Becomes relevant if finding #2 is fixed with IP keys. | `src/lib/rate-limit.ts` `rateKey` | Use platform-provided client IP (e.g. Vercel's `x-real-ip` normalization) or a shared store | Informational |

## Tested and passed

Static:

- **Secrets containment**: `TMDB_READ_TOKEN` used only server-side (`src/lib/tmdb.ts`, route handler only); `SUPABASE_SERVICE_ROLE_KEY` imported exclusively by `src/lib/supabase/admin.ts`, which only `api/account/delete` imports. Client components use only `NEXT_PUBLIC_*` vars. `next.config.ts` empty — no env leaks. `.env.local` gitignored (only `.env.local.example` with placeholder names committed); no `.env*` files in history.
- **Service-role scoping**: grep confirms admin client referenced nowhere else. Used solely for `auth.admin.deleteUser`.
- **Injection**: all DB access parameterized via supabase-js builders (`.eq("id", id)` etc.) — no string-built filters; `q` reaches TMDB through `URLSearchParams`; `ref` validated as integer before path interpolation into the TMDB URL. Handle normalized + regex-validated before every query.
- **AuthZ matrix walked per handler**: every mutating/owned route checks `auth.getUser()` server-side first and relies on RLS (`save_list` is SECURITY INVOKER); PATCH/DELETE precheck ownership via `ownedListId` with RLS making "not found" ≡ "not yours". Export/delete scoped to caller. Admin proposals gated by exact `OWNER_EMAIL` match with 404-silence.
- **XSS surface**: zero `dangerouslySetInnerHTML`; all user content rendered through JSX escaping; external share links fully `encodeURIComponent`'d with `rel="noopener noreferrer"`; poster paths concatenated into img src (worst case: broken image, not script).
- **Open redirect logic**: `safeNext` requires leading `/` and rejects `//`; callback template always emits `${origin}` + at least one slash before next, so backslash variants cannot reach authority position.

Dynamic (localhost):

- All 14 protected endpoints unauthenticated → 401 / 404 (admin silence) / 307→login. Zero 200s, zero 500-leaks.
- `/api/search?q=<script>alert(1)</script>` → safely JSON-encoded empty result; `ref=1 OR 1=1` → 400; giant numeric ref → 502 upstream guard; unknown mode → 400.
- Malformed JSON / wrong content-type / 100k-element payload on POST endpoints → 401 before body parsing when unauthenticated; authenticated parse path wrapped in try/catch → 400 (static).
- `/u/%2e%2e`, `/u/..%2f..%2fetc`, `/u/foo%2Fbar`, `/l/..%2f..` → router normalization or 404; no traversal.
- `/auth/callback?next=//evil.com`, `%2F%2Fevil.com`, `/\evil.com`, `https://evil.com` → same-origin `?auth_error=1` redirect (code exchange fails first; safeNext verified as second layer).
- IDOR shape: unauthenticated PATCH of foreign list id → 401.

## Not tested

- **Live Supabase RLS enforcement** — needs the real project; RLS correctness ("anyone reads done lists" visibility matrix, owner-only writes) is reviewed statically only.
- **Cross-user IDOR with two real accounts** — single-account local setup; covered statically by RLS + ownership prechecks.
- **Production headers/CSP/HSTS** — require the deployed origin.
- **Email deliverability / OAuth provider flows** (magic link, Google) — need configured providers.
- **Rate limits under concurrency / multi-instance** — in-memory limiter behavior across serverless instances.
- **Supabase Auth brute-force settings** (password attempt throttling) — dashboard-side configuration, not app code.
