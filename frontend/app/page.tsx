"use client";
import Link from "next/link";
export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>ChatOrbit</h1>
      <p>Multilingual, safety-first random chat.</p>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
        <Link href="/onboarding">OTP Sign-in</Link>
        <Link href="/queue">Queue</Link>
      </div>
    </main>
  );
}
