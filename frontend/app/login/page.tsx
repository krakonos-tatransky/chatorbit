"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${backend}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",            // <-- receive cookie
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Login failed");
      // cookie is set; go
      window.location.href = "/queue";
    } catch (e:any) {
      setMsg(e.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-svh grid place-items-center p-6 bg-neutral-50">
      <Card className="w-full max-w-sm bg-white">
        <CardHeader><CardTitle>Sign in</CardTitle></CardHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
          </div>
          <Button disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</Button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </form>
        <CardFooter className="flex justify-between text-sm mt-4">
          <Link href="/forgot-password" className="underline">Forgot password</Link>
          <Link href="/register" className="underline">Create account</Link>
        </CardFooter>
        <div className="text-xs text-neutral-500 mt-2">
          Prefer code sign-in? <Link href="/onboarding" className="underline">Use OTP</Link>.
        </div>
      </Card>
    </main>
  );
}
