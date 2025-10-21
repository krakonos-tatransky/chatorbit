"use client";

import Link, { type LinkProps } from "next/link";
import { useMemo, type MouseEvent, type ReactNode } from "react";

import { useLegalOverlay } from "@/components/legal/legal-overlay-provider";

type LegalAwareLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function LegalAwareLink({ href, children, className, onClick, ...rest }: LegalAwareLinkProps) {
  const overlay = useLegalOverlay();

  const legalDocument = useMemo(() => {
    if (typeof href === "string") {
      if (href === "/privacy-policy") {
        return "privacy" as const;
      }
      if (href === "/terms-of-service") {
        return "terms" as const;
      }
      if (href === "/help") {
        return "help" as const;
      }
    }
    return null;
  }, [href]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    if (!overlay || !legalDocument) {
      return;
    }
    const handled = overlay.openLegalDocument(legalDocument);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Link href={href} className={className} {...rest} onClick={handleClick}>
      {children}
    </Link>
  );
}
