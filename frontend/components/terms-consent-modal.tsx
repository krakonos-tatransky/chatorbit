"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/terms-content";

const SCROLL_TOLERANCE_PX = 12;

type TermsConsentModalProps = {
  open: boolean;
  onAgree: () => void;
  onCancel: () => void;
};

export function TermsConsentModal({ open, onAgree, onCancel }: TermsConsentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setHasScrolledToEnd(false);
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const reachedBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_TOLERANCE_PX;
      setHasScrolledToEnd(reachedBottom);
    };

    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const container = scrollContainerRef.current;
    container?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <div className="terms-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <header className="terms-modal__header">
          <h2 id={titleId} className="terms-modal__title">
            Review and accept the Terms of Service
          </h2>
          <p id={descriptionId} className="terms-modal__description">
            The chat session will only start after you confirm that you have read and agree to the Terms of Service. Last
            updated {TERMS_LAST_UPDATED}.
          </p>
        </header>
        <div ref={scrollContainerRef} tabIndex={0} className="terms-modal__body" aria-label="Terms of Service content">
          <div className="terms-modal__sections">
            {TERMS_SECTIONS.map((section) => (
              <article key={section.title} className="terms-modal__section">
                <h3 className="terms-modal__section-title">{section.title}</h3>
                <div className="terms-modal__section-body">{section.body}</div>
              </article>
            ))}
          </div>
        </div>
        <footer className="terms-modal__footer">
          <p className="terms-modal__helper">Scroll through the entire document to enable the AGREE button.</p>
          <div className="terms-modal__actions">
            <button
              type="button"
              className="button button--cyan terms-modal__agree"
              onClick={onAgree}
              disabled={!hasScrolledToEnd}
            >
              AGREE
            </button>
            <button type="button" className="terms-modal__cancel" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
