import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FeedbackModal from "./FeedbackModal";
import FeedbackTrigger from "./FeedbackTrigger";
import { FeedbackProvider, useFeedback } from "./FeedbackContext";
import FeedbackModalReExport from "../FeedbackModal";
import FeedbackTriggerReExport from "../FeedbackTrigger";

describe("FeedbackModal component", () => {
  it("renders an accessible native dialog with correct ARIA attributes", () => {
    const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

    // Native dialog
    expect(html).toContain("<dialog");
    expect(html).toContain('aria-labelledby="feedback-dialog-title"');
    expect(html).toContain('id="feedback-dialog-title"');
    expect(html).toContain("MovieRanker Feedback");
    expect(html).toContain("Send Feedback");

    // Close button
    expect(html).toContain('aria-label="Close feedback dialog"');
  });

  it("renders category selection pills with radio roles", () => {
    const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Feedback Category"');
    expect(html).toContain("Bug Report");
    expect(html).toContain("Feature Idea");
    expect(html).toContain("General Feedback");
    expect(html).toContain('role="radio"');
  });

  it("renders message textarea with character counter and required attribute", () => {
    const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

    expect(html).toContain('id="feedback-message"');
    expect(html).toContain('name="message"');
    expect(html).toContain("required");
    expect(html).toMatch(/maxlength="2000"/i);
    expect(html).toContain("0 / 2000");
    expect(html).toContain('aria-live="polite"');
  });

  it("renders optional email input with max length and helper text", () => {
    const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

    expect(html).toContain('id="feedback-email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(html).toMatch(/maxlength="320"/i);
    expect(html).toContain("optional");
  });

  it("renders submission and cancel buttons", () => {
    const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));

    expect(html).toContain("Submit Feedback");
    expect(html).toContain("Cancel");
  });

  it("renders hidden honeypot input for spam bot protection", () => {
    const html = renderToStaticMarkup(h(FeedbackModal, { isOpen: true }));
    expect(html).toContain('name="hp_website"');
  });

  it("renders the updated plain placeholder for general feedback", () => {
    const html = renderToStaticMarkup(
      h(FeedbackModal, { isOpen: true, initialCategory: "other" }),
    );
    expect(html).toContain('placeholder="What happened, or what would you like to see?"');
  });

  it("renders the error banner when in error status", () => {
    const html = renderToStaticMarkup(
      h(FeedbackModal, {
        isOpen: true,
        initialStatus: "error",
        initialErrorMessage: "Could not send feedback. Please try again.",
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not send feedback. Please try again.");
  });

  it("re-export from src/components/FeedbackModal matches default export", () => {
    expect(FeedbackModalReExport).toBe(FeedbackModal);
  });
});


describe("FeedbackTrigger component", () => {
  it("renders button with default text and aria-haspopup", () => {
    const html = renderToStaticMarkup(h(FeedbackTrigger));

    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("Support &amp; Feedback");
  });

  it("renders custom children and className", () => {
    const html = renderToStaticMarkup(
      h(FeedbackTrigger, { className: "custom-trigger-cls" }, "Give Feedback"),
    );

    expect(html).toContain("custom-trigger-cls");
    expect(html).toContain("Give Feedback");
  });

  it("re-export from src/components/FeedbackTrigger matches default export", () => {
    expect(FeedbackTriggerReExport).toBe(FeedbackTrigger);
  });
});

describe("FeedbackContext & Provider", () => {
  it("renders FeedbackProvider with children", () => {
    const html = renderToStaticMarkup(
      h(
        FeedbackProvider,
        null,
        h("div", { id: "test-child" }, "Child Content"),
      ),
    );

    expect(html).toContain('id="test-child"');
    expect(html).toContain("Child Content");
    expect(html).toContain("<dialog");
  });

  it("useFeedback returns default safe functions outside provider", () => {
    const TestConsumer = () => {
      const fb = useFeedback();
      return h("span", { "data-is-open": String(fb.isOpen) });
    };

    const html = renderToStaticMarkup(h(TestConsumer));
    expect(html).toContain('data-is-open="false"');
  });
});
