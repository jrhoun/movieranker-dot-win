"use client";

import { ReactNode } from "react";
import { useFeedback } from "./FeedbackContext";

export interface FeedbackTriggerProps {
  children?: ReactNode;
  className?: string;
  title?: string;
}

export default function FeedbackTrigger({
  children = "Support & Feedback",
  className,
  title = "Open feedback dialog",
}: FeedbackTriggerProps) {
  const { openFeedback } = useFeedback();

  return (
    <button
      type="button"
      onClick={openFeedback}
      className={className}
      title={title}
      aria-haspopup="dialog"
    >
      {children}
    </button>
  );
}
