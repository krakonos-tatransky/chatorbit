"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function Queue() {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const [status, setStatus] = useState<any>({});
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function join() {
    await fetch(`${backend}/queue/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  }
  async function leave() {
    await fetch(`${backend}/queue/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  }
  async function find() {
    const res = await fetch(`${backend}/match/find`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json(); setStatus(data);
  }

  useEffect(()=>{
    const timer = setInterval(async ()=>{
      const res = await fetch(`${backend}/queue/status`, { headers: { Authorization: `Bearer ${token}` } });
      setStatus(await res.json());
    }, 2000);
    return ()=>clearInterval(timer);
  }, [token]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Waiting Room</h2>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button onClick={join}>Join</button>
        <button onClick={leave}>Leave</button>
        <button onClick={find}>Find match</button>
      </div>
      <pre>{JSON.stringify(status, null, 2)}</pre>
      {status.room_id && <Link href={`/chat/${status.room_id}`}>Go to room</Link>}
    </main>
  );
}
