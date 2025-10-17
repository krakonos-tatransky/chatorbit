"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useId, type ReactNode } from "react";

import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";

type LegalDocument = "privacy" | "terms";

type LegalOverlayContextValue = {
  openLegalDocument: (document: LegalDocument) => boolean;
};

const LegalOverlayContext = createContext<LegalOverlayContextValue | null>(null);

export function useLegalOverlay() {
  return useContext(LegalOverlayContext);
}

type LegalOverlayProviderProps = {
  children: ReactNode;
};

export function LegalOverlayProvider({ children }: LegalOverlayProviderProps) {
  const [activeDocument, setActiveDocument] = useState<LegalDocument | null>(null);

  useEffect(() => {
    if (!activeDocument) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveDocument(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeDocument]);

  const openLegalDocument = useCallback((document: LegalDocument) => {
    setActiveDocument(document);
    return true;
  }, []);

  const contextValue = useMemo<LegalOverlayContextValue>(
    () => ({
      openLegalDocument,
    }),
    [openLegalDocument],
  );

  return (
    <LegalOverlayContext.Provider value={contextValue}>
      {children}
      <LegalDocumentModal openDocument={activeDocument} onClose={() => setActiveDocument(null)} />
    </LegalOverlayContext.Provider>
  );
}

type LegalDocumentModalProps = {
  openDocument: LegalDocument | null;
  onClose: () => void;
};

function LegalDocumentModal({ openDocument, onClose }: LegalDocumentModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!openDocument) {
      return;
    }
    const closeButton = document.getElementById(`${titleId}-close`);
    closeButton?.focus({ preventScroll: true });
  }, [openDocument, titleId]);

  if (!openDocument) {
    return null;
  }

  const title = openDocument === "privacy" ? "Privacy Policy" : "Terms of Service";

  return (
    <div className="legal-overlay" role="presentation">
      <div className="legal-overlay__backdrop" onClick={onClose} />
      <div className="legal-overlay__dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <header className="legal-overlay__header">
          <h2 id={titleId} className="legal-overlay__title">
            {title}
          </h2>
          <button
            id={`${titleId}-close`}
            type="button"
            className="legal-overlay__close"
            onClick={onClose}
            aria-label="Close legal document"
          >
            Close
          </button>
        </header>
        <div id={descriptionId} className="legal-overlay__body" role="document">
          <div className="legal-overlay__content">
            {openDocument === "privacy" ? (
              <PrivacyPolicyContent className="legal-page__inner legal-overlay__document" headingLevel="h2" showHeading={false} />
            ) : (
              <TermsOfServiceContent className="legal-page__inner legal-overlay__document" headingLevel="h2" showHeading={false} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
