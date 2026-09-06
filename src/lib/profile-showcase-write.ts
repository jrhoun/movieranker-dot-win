import { supabaseAdmin, supabaseSecretKey } from "@/lib/supabase/admin";
import type { ProfileShowcase } from "./public-profile";

/**
 * THE ONE WAY `profiles.showcase` GETS WRITTEN.
 *
 * WHY THIS EXISTS. `profiles` has RLS "write own", so any signed-in user could
 * `update({ showcase })` on their own row straight from the browser — and the
 * showcase is where career XP (`lifetimeXp`), cosmetic ownership and every
 * reward field live. supabase/migrations/20260904_showcase_server_writes.sql
 * closed that: table-level UPDATE is revoked from `authenticated`, the safe
 * columns (handle, visibility, referred_by) are granted back one by one, and
 * `showcase` is reachable only through `set_profile_showcase()`, a SECURITY
 * DEFINER function that only `service_role` may execute. So the two places in
 * the app that used to write the column with the user's own session client —
 * /api/profile PATCH and the XP ratchet on /u/profile — now come through here,
 * with the service-role client.
 *
 * WHAT IT DOES NOT DO. Nothing about the CONTENT is checked here. Ownership of
 * an equipped cosmetic, the poster-claim allowance, the pin-level gate, the
 * lifetimeXp trust boundary — all of that stays in /api/profile and
 * mergeShowcase, in TypeScript, where the catalogue and the XP curve live. This
 * is the transport, and it is deliberately dumb: it takes an already-validated
 * ProfileShowcase for one user id and puts it in one row.
 *
 * WHY IT THROWS INSTEAD OF RETURNING `{ error }`. The ratchet write used to be a
 * `void supabase.from("profiles").update(...)` — floating, unchecked — and the
 * day the revoke landed it started failing with 42501 and nobody could tell.
 * A thrown, typed error is something a caller has to decide about: the API maps
 * it to a status code, the page logs it. And a MISSING secret key is its own
 * kind, because the admin client is built with `?? ""` and would otherwise
 * fail at the network with an opaque 401; the deploy that forgets the key
 * should say so in plain words.
 */

export type ShowcaseWriteFailure =
  /** Neither SUPABASE_SECRET_KEY nor SUPABASE_SERVICE_ROLE_KEY is set. Nothing was written. */
  | "no_service_key"
  /** No profiles row for this user — a handle has not been claimed yet. */
  | "no_profile"
  /** Any other failure from the RPC; `message` carries the database's text. */
  | "rpc";

export class ShowcaseWriteError extends Error {
  readonly kind: ShowcaseWriteFailure;
  constructor(kind: ShowcaseWriteFailure, message: string) {
    super(message);
    this.name = "ShowcaseWriteError";
    this.kind = kind;
  }
}

/** Postgres SQLSTATE the RPC raises when the user has no profiles row. */
const NO_DATA_FOUND = "P0002";

/**
 * Persist a fully-merged, already-validated showcase for `userId`.
 * Resolves with the value the database stored.
 */
export async function writeProfileShowcase(
  userId: string,
  showcase: ProfileShowcase,
): Promise<ProfileShowcase> {
  if (!supabaseSecretKey()) {
    throw new ShowcaseWriteError(
      "no_service_key",
      "SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) is not set; profile " +
        "showcase writes go through the privileged RPC set_profile_showcase and cannot run without it.",
    );
  }
  const { data, error } = await supabaseAdmin().rpc("set_profile_showcase", {
    p_user_id: userId,
    p_showcase: showcase,
  });
  if (error) {
    if (error.code === NO_DATA_FOUND) {
      throw new ShowcaseWriteError("no_profile", error.message);
    }
    throw new ShowcaseWriteError("rpc", error.message);
  }
  return (data as ProfileShowcase | null) ?? showcase;
}
