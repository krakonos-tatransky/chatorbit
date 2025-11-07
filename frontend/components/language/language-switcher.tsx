"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/components/language/language-provider";

type LanguageSwitcherProps = {
  hideOnMobile?: boolean;
};

export function LanguageSwitcher({ hideOnMobile }: LanguageSwitcherProps) {
  const { availableLanguages, definition, setLanguage, language, translations } = useLanguage();
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSelect = useCallback(
    (code: string) => {
      if (code === language) {
        setOpen(false);
        return;
      }
      setLanguage(code as typeof language);
      setOpen(false);
    },
    [language, setLanguage],
  );

  const otherLanguages = useMemo(
    () =>
      availableLanguages.map((item) => ({
        ...item,
        isCurrent: item.code === language,
      })),
    [availableLanguages, language],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!containerRef.current || containerRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`language-switcher${hideOnMobile ? " language-switcher--mobile-hidden" : ""}`}
    >
      <button
        type="button"
        className="language-switcher__toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={handleToggle}
        title={translations.languageSwitcher.buttonLabel}
      >
        <span aria-hidden>{definition.flagEmoji}</span>
        <span className="language-switcher__label">{definition.nativeLabel}</span>
      </button>

      {open ? (
        <div className="language-switcher__dialog" role="dialog" aria-modal="true" id={dialogId}>
          <div className="language-switcher__header">
            <h3>{translations.languageSwitcher.dialogTitle}</h3>
            <button
              type="button"
              className="language-switcher__close"
              onClick={handleClose}
              aria-label={translations.languageSwitcher.closeLabel}
            >
              ×
            </button>
          </div>
          <ul className="language-switcher__list">
            {otherLanguages.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  className={`language-switcher__option${item.isCurrent ? " language-switcher__option--active" : ""}`}
                  onClick={() => handleSelect(item.code)}
                >
                  <span className="language-switcher__option-flag" aria-hidden>
                    {item.flagEmoji}
                  </span>
                  <span className="language-switcher__option-text">
                    <span>{item.nativeLabel}</span>
                    <span className="language-switcher__option-sub">{item.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
