"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import FeedbackModal from "./FeedbackModal";

export interface FeedbackContextValue {
  isOpen: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openFeedback = useCallback(() => setIsOpen(true), []);
  const closeFeedback = useCallback(() => setIsOpen(false), []);

  return (
    <FeedbackContext.Provider value={{ isOpen, openFeedback, closeFeedback }}>
      {children}
      <FeedbackModal isOpen={isOpen} onClose={closeFeedback} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    return {
      isOpen: false,
      openFeedback: () => {},
      closeFeedback: () => {},
    };
  }
  return ctx;
}
