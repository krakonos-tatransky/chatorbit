"use client";
import { useState } from "react";

export default function Onboarding() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  async function requestOTP() {
    setMsg(null);
    const res = await fetch(`${backend}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.dev_code) {
      setCode(data.dev_code);
    }
    setMsg(data.note || "OTP sent");
  }

  async function verifyOTP() {
    setMsg(null);
    const res = await fetch(`${backend}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = "/queue";
    } else {
      setMsg(data?.detail || "Could not verify code");
    }
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 12 }}>
      <h2>Onboarding</h2>
      <label>Email</label>
      <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={requestOTP}>Request OTP</button>
        <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="000000"/>
        <button onClick={verifyOTP}>Verify</button>
      </div>
      {msg && <p>{msg}</p>}
    </main>
  );
}
