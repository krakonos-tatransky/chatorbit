"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"request"|"reset">("request");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestReset() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${backend}/auth/password/forgot`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email })
      });
      const data = await r.json();
      if (data.dev_token) { setToken(data.dev_token); setStage("reset"); }
      setMsg("If the email exists, a reset token was issued.");
    } catch { setMsg("Could not start reset."); }
    finally { setBusy(false); }
  }

  async function doReset() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${backend}/auth/password/reset`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email, token, new_password: password })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || "Reset failed");
      setMsg("Password updated. You can Sign in now.");
    } catch (e:any) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-svh grid place-items-center p-6 bg-neutral-50">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Forgot password</CardTitle></CardHeader>
        <div className="grid gap-3">
          {stage === "request" ? (
            <>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
              <Button disabled={busy} onClick={requestReset}>{busy ? "Sending…" : "Send reset link"}</Button>
            </>
          ) : (
            <>
              <Label>Reset token</Label>
              <Input value={token} onChange={e=>setToken(e.target.value)} />
              <Label>New password</Label>
              <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} />
              <Button disabled={busy} onClick={doReset}>{busy ? "Updating…" : "Update password"}</Button>
            </>
          )}
          {msg && <p className="text-sm text-neutral-700">{msg}</p>}
          <div className="flex justify-between text-sm mt-2">
            <Link className="underline" href="/login">Back to login</Link>
            <Link className="underline" href="/register">Create account</Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
