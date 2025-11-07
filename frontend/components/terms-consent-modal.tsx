"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/components/language/language-provider";
import { getTermsTranslation } from "@/lib/i18n/translations";

const SCROLL_TOLERANCE_PX = 96;

type TermsConsentModalProps = {
  open: boolean;
  onAgree: () => void;
  onCancel: () => void;
};

export function TermsConsentModal({ open, onAgree, onCancel }: TermsConsentModalProps) {
  const {
    language,
    translations: { termsModal },
  } = useLanguage();
  const { lastUpdated, sections } = getTermsTranslation(language);
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

    if (!mounted) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - clientHeight - scrollTop;

      if (distanceFromBottom <= SCROLL_TOLERANCE_PX) {
        setHasScrolledToEnd((previous) => {
          if (previous) {
            return previous;
          }
          return true;
        });
      }
    };

    let animationFrame: number | null = null;
    if (typeof window !== "undefined") {
      animationFrame = window.requestAnimationFrame(handleScroll);
    } else {
      handleScroll();
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (animationFrame !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(animationFrame);
      }
      container.removeEventListener("scroll", handleScroll);
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!mounted) {
      return;
    }
    const container = scrollContainerRef.current;
    container?.focus({ preventScroll: true });
  }, [mounted, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    console.log("[TermsConsentModal] hasScrolledToEnd updated", hasScrolledToEnd);
  }, [open, hasScrolledToEnd]);

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
            {termsModal.title}
          </h2>
          <p id={descriptionId} className="terms-modal__description">
            {termsModal.description.replace("{date}", lastUpdated)}
          </p>
        </header>
        <div ref={scrollContainerRef} tabIndex={0} className="terms-modal__body" aria-label={termsModal.contentLabel}>
          <div className="terms-modal__sections">
            {sections.map((section) => (
              <article key={section.title} className="terms-modal__section">
                <h3 className="terms-modal__section-title">{section.title}</h3>
                <div className="terms-modal__section-body">{section.body}</div>
              </article>
            ))}
          </div>
        </div>
        <footer className="terms-modal__footer">
          <p className="terms-modal__helper">{termsModal.helper}</p>
          <div className="terms-modal__actions">
            <button
              type="button"
              className="button button--cyan terms-modal__agree"
              onClick={onAgree}
              disabled={!hasScrolledToEnd}
            >
              {termsModal.agree}
            </button>
            <button type="button" className="terms-modal__cancel" onClick={onCancel}>
              {termsModal.cancel}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
