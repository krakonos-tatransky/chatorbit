"use client";

import Link from "next/link";
import { type ReactNode } from "react";

type AdminLayoutProps = {
  active: "sessions" | "reports";
  onLogout: () => void;
  children: ReactNode;
};

export function AdminLayout({ active, onLogout, children }: AdminLayoutProps) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <h1 className="admin-header__title">ChatOrbit administration</h1>
          <p className="admin-header__subtitle">Real-time visibility into live sessions and incident reports.</p>
        </div>
        <button type="button" className="admin-button admin-button--ghost" onClick={onLogout}>
          Sign out
        </button>
      </header>
      <nav className="admin-nav" aria-label="Administration">
        <Link href="/administracia" className={`admin-nav__link${active === "sessions" ? " admin-nav__link--active" : ""}`}>
          Sessions
        </Link>
        <Link
          href="/administracia/reports"
          className={`admin-nav__link${active === "reports" ? " admin-nav__link--active" : ""}`}
        >
          Abuse reports
        </Link>
      </nav>
      <main className="admin-content">{children}</main>
    </div>
  );
}
