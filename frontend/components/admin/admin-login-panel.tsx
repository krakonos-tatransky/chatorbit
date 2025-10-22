"use client";

import { useState, type FormEvent } from "react";

import { apiUrl } from "@/lib/api";

type AdminLoginPanelProps = {
  onAuthenticated: (token: string) => void;
};

export function AdminLoginPanel({ onAuthenticated }: AdminLoginPanelProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = new URLSearchParams({ username, password });
      const response = await fetch(apiUrl("/api/admin/token"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!response.ok) {
        throw new Error("Invalid credentials. Please try again.");
      }
      const payload = await response.json();
      if (!payload?.access_token) {
        throw new Error("Unexpected response from server.");
      }
      onAuthenticated(payload.access_token as string);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-card admin-card--centered">
      <h2 className="admin-card__title">Admin authentication required</h2>
      <p className="admin-card__description">
        Enter your administrator credentials to view session analytics and abuse reports. Multi-factor authentication is
        enforced outside of this demo environment.
      </p>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="admin-form__field">
          Username
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label className="admin-form__field">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="admin-form__error">{error}</p> : null}
        <button type="submit" className="admin-button" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
