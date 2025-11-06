"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useId,
  type ReactNode,
} from "react";

import { HelpContent } from "@/components/help/help-content";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";
import { useLanguage } from "@/components/language/language-provider";

type LegalDocument = "privacy" | "terms" | "help";

type LegalOverlayContextValue = {
  openLegalDocument: (document: LegalDocument) => boolean;
  setOverlayEnabled: (enabled: boolean) => void;
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
  const [isOverlayEnabled, setOverlayEnabled] = useState(false);

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

  useEffect(() => {
    if (!isOverlayEnabled && activeDocument) {
      setActiveDocument(null);
    }
  }, [isOverlayEnabled, activeDocument]);

  const openLegalDocument = useCallback(
    (document: LegalDocument) => {
      if (!isOverlayEnabled) {
        return false;
      }
      setActiveDocument(document);
      return true;
    },
    [isOverlayEnabled],
  );

  const handleSetOverlayEnabled = useCallback((enabled: boolean) => {
    setOverlayEnabled(enabled);
  }, []);

  const contextValue = useMemo<LegalOverlayContextValue>(
    () => ({
      openLegalDocument,
      setOverlayEnabled: handleSetOverlayEnabled,
    }),
    [openLegalDocument, handleSetOverlayEnabled],
  );

  return (
    <LegalOverlayContext.Provider value={contextValue}>
      {children}
      <LegalDocumentModal openDocument={activeDocument} onClose={() => setActiveDocument(null)} />
    </LegalOverlayContext.Provider>
  );
}

type LegalOverlayBoundaryProps = {
  children: ReactNode;
};

export function LegalOverlayBoundary({ children }: LegalOverlayBoundaryProps) {
  const overlay = useLegalOverlay();

  useEffect(() => {
    if (!overlay) {
      return;
    }
    overlay.setOverlayEnabled(true);
    return () => overlay.setOverlayEnabled(false);
  }, [overlay]);

  return <>{children}</>;
}

type LegalDocumentModalProps = {
  openDocument: LegalDocument | null;
  onClose: () => void;
};

function LegalDocumentModal({ openDocument, onClose }: LegalDocumentModalProps) {
  const {
    translations: { legalOverlay },
  } = useLanguage();
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

  const title =
    openDocument === "privacy"
      ? legalOverlay.privacyTitle
      : openDocument === "terms"
        ? legalOverlay.termsTitle
        : legalOverlay.helpTitle;

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
            aria-label={legalOverlay.closeLabel}
          >
            {legalOverlay.closeButton}
          </button>
        </header>
        <div id={descriptionId} className="legal-overlay__body" role="document">
          <div
            className={`legal-overlay__content${openDocument === "help" ? " legal-overlay__content--help" : ""}`}
          >
            {openDocument === "privacy" ? (
              <PrivacyPolicyContent className="legal-page__inner legal-overlay__document" headingLevel="h2" showHeading={false} />
            ) : openDocument === "terms" ? (
              <TermsOfServiceContent className="legal-page__inner legal-overlay__document" headingLevel="h2" showHeading={false} />
            ) : (
              <div className="help-page help-page--overlay">
                <HelpContent headingLevel="h3" showHeading={false} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
