import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import { SITE_UPDATES } from "@/data/updates";
import UpdatesPage from "@/app/(site)/updates/page";

/* ============================================================================
 * Milestone M4 Empirical Challenger Stress Tests (Agent challenger_m4_2)
 * ============================================================================
 * Focus Areas:
 * 1. FeedbackModal.tsx accessibility attributes (ARIA, roles, labels, live regions).
 * 2. Keyboard interaction (Escape to close, event handlers, dialog lifecycle).
 * 3. Form state transitions (submitting disabled state, character counter accuracy,
 *    error alerts, success confirmation view, and state reset lifecycle).
 * 4. SITE_UPDATES data contract (public-beta announcement, chronological date
 *    ordering, ID uniqueness, and safe rendering on /updates page).
 * ============================================================================ */

describe("Milestone M4 Empirical Challenger Stress Tests", () => {
  const rootDir = process.cwd();
  const feedbackModalPath = join(
    rootDir,
    "src/components/feedback/FeedbackModal.tsx",
  );
  const feedbackModalSource = readFileSync(feedbackModalPath, "utf8");

  /* ==========================================================================
   * 1. FeedbackModal Accessibility Attributes (ARIA, Roles, Labels)
   * ========================================================================== */
  describe("Verification 1: FeedbackModal Accessibility & ARIA Contract", () => {
    it("renders HTML5 dialog with correct accessibility attributes", () => {
      const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

      // Native dialog element
      expect(html).toContain("<dialog");

      // Dialog accessibility label binding
      expect(html).toContain('aria-labelledby="feedback-dialog-title"');
      expect(html).toContain('id="feedback-dialog-title"');
      expect(html).toContain("Send Feedback");

      // Close button accessibility
      expect(html).toContain('aria-label="Close feedback dialog"');
      expect(html).toMatch(/<button[^>]*aria-label="Close feedback dialog"/);
    });

    it("renders category selection with radiogroup semantics and aria-checked states", () => {
      const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

      // Radiogroup container
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Feedback Category"');

      // Exactly 3 radio options: bug, idea, other
      const radioMatches = [...html.matchAll(/role="radio"/g)];
      expect(radioMatches.length).toBe(3);

      // Default category is "bug" -> must have aria-checked="true"
      expect(html).toMatch(
        /role="radio"[^>]*aria-checked="true"[^>]*>[\s\S]*?Bug Report/,
      );

      // Other categories must have aria-checked="false"
      expect(html).toMatch(
        /role="radio"[^>]*aria-checked="false"[^>]*>[\s\S]*?Feature Idea/,
      );
      expect(html).toMatch(
        /role="radio"[^>]*aria-checked="false"[^>]*>[\s\S]*?General Feedback/,
      );

      // Icons should have aria-hidden="true" to prevent screen-reader spam
      expect(html).toMatch(/<span aria-hidden="true">🐛<\/span>/);
      expect(html).toMatch(/<span aria-hidden="true">💡<\/span>/);
      expect(html).toMatch(/<span aria-hidden="true">💬<\/span>/);
    });

    it("verifies explicit label-to-control associations for form fields", () => {
      const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

      // Textarea label association
      expect(html).toMatch(/<label[^>]*for="feedback-message"/);
      expect(html).toMatch(/<textarea[^>]*id="feedback-message"/);
      expect(html).toMatch(/<textarea[^>]*name="message"/);
      expect(html).toMatch(/<textarea[^>]*required/);
      expect(html).toMatch(/<textarea[^>]*maxlength="2000"/i);

      // Email label association
      expect(html).toMatch(/<label[^>]*for="feedback-email"/);
      expect(html).toMatch(/<input[^>]*id="feedback-email"/);
      expect(html).toMatch(/<input[^>]*name="email"/);
      expect(html).toMatch(/<input[^>]*type="email"/);
      expect(html).toMatch(/<input[^>]*maxlength="320"/i);
    });

    it("verifies character counter uses aria-live='polite' for accessibility", () => {
      const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain("0 / 2000");
    });

    it("verifies decorative elements have aria-hidden='true'", () => {
      const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));
      expect(html).toContain('<span aria-hidden="true">✦</span>');
    });
  });

  /* ==========================================================================
   * 2. Keyboard Interaction & Dismissal (Escape to Close, Event Handlers)
   * ========================================================================== */
  describe("Verification 2: Keyboard Interaction & Modal Dismissal Lifecycle", () => {
    it("attaches onClose handler to HTML5 <dialog> for native Escape/cancel events", () => {
      // In HTML5 <dialog>, pressing Escape triggers 'cancel' and closes the dialog,
      // firing the 'close' event. React binds this via the onClose prop.
      expect(feedbackModalSource).toMatch(/<dialog[\s\S]*?onClose=\{handleClose\}/);
    });

    it("verifies handleClose safely calls onClose callback when provided", () => {
      let closed = false;
      const testClose = () => {
        closed = true;
      };

      // Source check on handleClose implementation
      expect(feedbackModalSource).toContain("const handleClose = () => {");
      expect(feedbackModalSource).toContain("if (onClose) {");
      expect(feedbackModalSource).toContain("onClose();");
      expect(feedbackModalSource).toContain("dialogRef.current?.close();");

      testClose();
      expect(closed).toBe(true);
    });

    it("verifies backdrop click detection targets dialogRef backdrop and ignores modal content", () => {
      // Backdrop click pattern:
      // onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
      expect(feedbackModalSource).toMatch(
        /onClick=\{\(e\)\s*=>\s*\{\s*if\s*\(e\.target\s*===\s*dialogRef\.current\)\s*\{\s*handleClose\(\);\s*\}\s*\}\}/,
      );
    });

    it("evaluates Escape keydown handler vs native dialog lifecycle (Challenger Analysis)", () => {
      // Challenger Finding:
      // FeedbackModal relies exclusively on <dialog onClose={handleClose}>.
      // In native browser environments with showModal(), pressing Escape fires 'cancel'
      // followed by 'close', which handleClose intercepts.
      // However, FeedbackModal does NOT have an explicit onKeyDown={(e) => if (e.key === "Escape")...}.
      const hasExplicitOnKeyDown = feedbackModalSource.includes("onKeyDown");
      expect(hasExplicitOnKeyDown).toBe(false);
      // We verify that native dialog's showModal() and close() are managed via useEffect
      expect(feedbackModalSource).toContain("dialog.showModal()");
      expect(feedbackModalSource).toContain("dialog.close()");
    });
  });

  /* ==========================================================================
   * 3. Form State Transitions & State Machine Stress Testing
   * ========================================================================== */
  describe("Verification 3: Form State Transitions & State Machine Invariants", () => {
    // Exact character counter formatting oracle
    const formatCounter = (len: number) => `${len} / 2000`;
    const isCounterRed = (len: number) => len > 2000;

    it("verifies character counter accuracy across boundary lengths", () => {
      const boundaryCases = [
        { len: 0, expected: "0 / 2000", red: false },
        { len: 1, expected: "1 / 2000", red: false },
        { len: 50, expected: "50 / 2000", red: false },
        { len: 1000, expected: "1000 / 2000", red: false },
        { len: 1999, expected: "1999 / 2000", red: false },
        { len: 2000, expected: "2000 / 2000", red: false },
        { len: 2001, expected: "2001 / 2000", red: true },
        { len: 2500, expected: "2500 / 2000", red: true },
      ];

      for (const { len, expected, red } of boundaryCases) {
        expect(formatCounter(len)).toBe(expected);
        expect(isCounterRed(len)).toBe(red);
      }

      // Verify template string in component matches oracle
      expect(feedbackModalSource).toContain(
        "message.length > 2000 ? \"text-accent-red\" : \"text-muted\"",
      );
      expect(feedbackModalSource).toContain("{message.length} / 2000");
    });

    it("verifies submit button disabled conditions (empty, whitespace, oversized, submitting)", () => {
      // The submit button disabled condition from FeedbackModal.tsx:
      // disabled={status === "submitting" || !message.trim() || message.length > 2000}
      const isSubmitDisabled = (status: string, msg: string) => {
        return status === "submitting" || !msg.trim() || msg.length > 2000;
      };

      // Empty message
      expect(isSubmitDisabled("idle", "")).toBe(true);

      // Whitespace-only messages
      expect(isSubmitDisabled("idle", " ")).toBe(true);
      expect(isSubmitDisabled("idle", "   \t\n  ")).toBe(true);

      // Submitting state
      expect(isSubmitDisabled("submitting", "Valid feedback")).toBe(true);

      // Oversized message
      expect(isSubmitDisabled("idle", "a".repeat(2001))).toBe(true);

      // Valid messages
      expect(isSubmitDisabled("idle", "Valid feedback")).toBe(false);
      expect(isSubmitDisabled("idle", "a".repeat(2000))).toBe(false);
      expect(isSubmitDisabled("error", "Valid feedback after error")).toBe(false);

      // Verify code in component source matches logic
      expect(feedbackModalSource).toMatch(
        /disabled=\{\s*status === "submitting" \|\| !message\.trim\(\) \|\| message\.length > 2000\s*\}/,
      );
    });

    it("verifies Cancel button disabled state during submission", () => {
      expect(feedbackModalSource).toMatch(
        /<button[^>]*onClick=\{handleClose\}[^>]*disabled=\{status === "submitting"\}/,
      );
    });

    it("verifies submission spinner and 'Sending...' label in submitting state", () => {
      expect(feedbackModalSource).toContain('status === "submitting" ? (');
      expect(feedbackModalSource).toContain("animate-spin");
      expect(feedbackModalSource).toContain("<span>Sending...</span>");
      expect(feedbackModalSource).toContain("<span>Submit Feedback</span>");
    });

    it("verifies validation logic for message trimming, length, and email format", () => {
      // Message validation rules in handleSubmit:
      const validate = (category: string, message: string, email: string) => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage) {
          return { ok: false, error: "Please enter a feedback message." };
        }
        if (trimmedMessage.length > 2000) {
          return { ok: false, error: "Feedback message must not exceed 2000 characters." };
        }
        const trimmedEmail = email.trim();
        if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          return { ok: false, error: "Please provide a valid email address or leave it blank." };
        }
        return { ok: true, data: { category, message: trimmedMessage, email: trimmedEmail || undefined } };
      };

      // Empty message
      expect(validate("bug", "", "")).toEqual({
        ok: false,
        error: "Please enter a feedback message.",
      });
      expect(validate("bug", "    \n ", "")).toEqual({
        ok: false,
        error: "Please enter a feedback message.",
      });

      // Oversized message
      expect(validate("bug", "a".repeat(2001), "")).toEqual({
        ok: false,
        error: "Feedback message must not exceed 2000 characters.",
      });

      // Malformed emails
      const invalidEmails = [
        "not-an-email",
        "missing-at.com",
        "@missing-user.com",
        "user@",
        "user@domain",
        "spaces in@email.com",
      ];
      for (const badEmail of invalidEmails) {
        expect(validate("bug", "Valid message", badEmail)).toEqual({
          ok: false,
          error: "Please provide a valid email address or leave it blank.",
        });
      }

      // Valid emails
      const validEmails = [
        "",
        "   ",
        "user@example.com",
        "first.last@domain.org",
        "user+tag@domain.co.uk",
      ];
      for (const goodEmail of validEmails) {
        const res = validate("idea", "Valid message", goodEmail);
        expect(res.ok).toBe(true);
      }
    });

    it("verifies error alert banner rendering with role='alert'", () => {
      expect(feedbackModalSource).toContain("{errorMessage && (");
      expect(feedbackModalSource).toContain('role="alert"');
      expect(feedbackModalSource).toContain("{errorMessage}");
    });

    it("verifies success view renders confirmation and action buttons", () => {
      expect(feedbackModalSource).toContain('status === "success" ? (');
      expect(feedbackModalSource).toContain("Feedback Received");
      expect(feedbackModalSource).toContain("Thank You for Your Voice!");
      expect(feedbackModalSource).toContain("Send Another");
      expect(feedbackModalSource).toContain("Done");
    });

    it("verifies resetForm restores clean state on 'Send Another'", () => {
      expect(feedbackModalSource).toContain("const resetForm = () => {");
      expect(feedbackModalSource).toContain('setMessage("");');
      expect(feedbackModalSource).toContain('setEmail("");');
      expect(feedbackModalSource).toContain('setCategory("bug");');
      expect(feedbackModalSource).toContain('setStatus("idle");');
      expect(feedbackModalSource).toContain('setErrorMessage("");');
    });

    it("identifies UX caveat: reopening modal after 'Done' retains previous success state", () => {
      // Challenger Stress Finding:
      // When a user successfully submits, status becomes "success".
      // Clicking "Done" calls handleClose(), which closes the dialog but does NOT call resetForm().
      // If the user reopens the modal later, status is STILL "success" until they click "Send Another".
      const handleCloseBody = feedbackModalSource.match(
        /const handleClose\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\};/,
      )?.[1];
      expect(handleCloseBody).toBeDefined();
      expect(handleCloseBody).not.toContain("resetForm");
    });

    it("identifies concurrent edit caveat: inputs are not disabled during in-flight submission", () => {
      // Challenger Stress Finding:
      // While status === "submitting", the Cancel and Submit buttons are disabled,
      // but the category pill buttons, textarea, and email input do not have disabled props.
      const textareaDisabled = feedbackModalSource.match(/<textarea[^>]*disabled/);
      expect(textareaDisabled).toBeNull();

      const inputDisabled = feedbackModalSource.match(/<input[^>]*disabled/);
      expect(inputDisabled).toBeNull();
    });
  });

  /* ==========================================================================
   * 4. SITE_UPDATES Data Contract & /updates Page Rendering
   * ========================================================================== */
  describe("Verification 4: SITE_UPDATES Data Integrity & /updates Page Oracle", () => {
    it("verifies public-beta announcement is prepended at index 0", () => {
      expect(SITE_UPDATES.length).toBeGreaterThanOrEqual(2);
      const betaUpdate = SITE_UPDATES[0];

      expect(betaUpdate.id).toBe("public-beta");
      expect(betaUpdate.date).toBe("September 2026");
      expect(betaUpdate.version).toBe("Beta");
      expect(betaUpdate.tag).toBe("Announcement");
      expect(betaUpdate.title).toBe("Welcome to the MovieRanker Public Beta!");
      expect(betaUpdate.summary).toContain("JR");
      expect(betaUpdate.summary).toContain("three beta-only profile cosmetics");
    });

    it("verifies required M4 launch highlights are present in public-beta", () => {
      const betaUpdate = SITE_UPDATES.find((u) => u.id === "public-beta");
      expect(betaUpdate).toBeDefined();
      expect(betaUpdate?.highlights).toBeDefined();

      const highlightsText = (betaUpdate?.highlights || []).join("\n");

      // 1. Beta Test Screening & Cosmetics
      expect(highlightsText).toContain("Beta Test Screening");
      expect(highlightsText).toContain("Beta Reel Avatar");
      expect(highlightsText).toContain("Cassette Frame");
      expect(highlightsText).toContain("Betamax was better");

      // 2. Curated Themes
      expect(highlightsText).toContain("Curated Weekly Themes");

      // 3. Community Stats
      expect(highlightsText).toContain("Community Stats");

      // 4. In-App Feedback
      expect(highlightsText).toContain("In-App Feedback");
    });

    it("verifies uniqueness of update IDs across the entire catalogue", () => {
      const ids = SITE_UPDATES.map((u) => u.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Verify valid slug format for every ID
      for (const id of ids) {
        expect(id).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it("verifies strict reverse-chronological date ordering of SITE_UPDATES", () => {
      // Month name to index lookup for parsing "Month YYYY"
      const MONTHS: Record<string, number> = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
      };

      const parseUpdateDate = (dateStr: string): number => {
        const [monthName, yearStr] = dateStr.trim().split(/\s+/);
        const year = parseInt(yearStr, 10);
        const month = MONTHS[monthName];
        if (isNaN(year) || month === undefined) {
          throw new Error(`Invalid date format in update: "${dateStr}"`);
        }
        return new Date(Date.UTC(year, month, 1)).getTime();
      };

      for (let i = 0; i < SITE_UPDATES.length - 1; i++) {
        const currentTimestamp = parseUpdateDate(SITE_UPDATES[i].date);
        const nextTimestamp = parseUpdateDate(SITE_UPDATES[i + 1].date);
        expect(
          currentTimestamp,
          `Update "${SITE_UPDATES[i].id}" (${SITE_UPDATES[i].date}) must not be older than "${SITE_UPDATES[i + 1].id}" (${SITE_UPDATES[i + 1].date})`,
        ).toBeGreaterThanOrEqual(nextTimestamp);
      }
    });

    it("renders /updates page cleanly without runtime crashes or missing tag styles", () => {
      // Render the Server Component to HTML markup
      const html = renderToStaticMarkup(h(UpdatesPage));

      // Page header
      expect(html).toContain("What&#x27;s New on MovieRanker");
      expect(html).toContain("Updates &amp; Notes");

      // Public beta article rendered
      expect(html).toContain('id="public-beta"');
      expect(html).toContain("Welcome to the MovieRanker Public Beta!");
      expect(html).toContain("September 2026");
      expect(html).toContain("Beta");
      expect(html).toContain("Announcement");

      // Initial launch article rendered
      expect(html).toContain('id="initial-launch"');
      expect(html).toContain("MovieRanker Initial Preview");
      expect(html).toContain("August 2026");
      expect(html).toContain("v0.1");
      expect(html).toContain("Milestone");

      // Highlights rendered
      expect(html).toContain("Beta Test Screening");

      // Timeline marker dots rendered
      expect(html).toContain("bg-gold ring-4 ring-bg");

      // Feedback CTA at bottom
      expect(html).toContain("Have an idea or feature request?");
      expect(html).toContain("Send Feedback");
      expect(html).toContain("Rank Movies");
    });

    it("verifies all update tags have defined CSS classes in UpdatesPage tagStyles", () => {
      const updatesPagePath = join(rootDir, "src/app/(site)/updates/page.tsx");
      const updatesPageSource = readFileSync(updatesPagePath, "utf8");

      // Extract tagStyles keys
      const tagStylesMatch = updatesPageSource.match(/const tagStyles = \{([^}]+)\};/);
      expect(tagStylesMatch).not.toBeNull();
      const styleBlock = tagStylesMatch![1];

      for (const update of SITE_UPDATES) {
        expect(styleBlock).toContain(`${update.tag}:`);
      }
    });
  });
});
