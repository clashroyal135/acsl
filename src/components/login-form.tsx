"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Sign-in is not available yet."); setLoading(false); return; }
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message); else { router.push("/problems"); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
      setMessage(error ? error.message : "Account created. Check your email if confirmation is enabled.");
    }
    setLoading(false);
  }

  return <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-soft"><span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" /></span><h1 className="text-2xl font-black">{mode === "login" ? "Sign in" : "Create account"}</h1>
    <form onSubmit={submit} className="mt-6 space-y-4">{mode === "register" && <Field label="Display name" value={name} onChange={setName} type="text" autoComplete="name" />}<Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" /><Field label="Password" value={password} onChange={setPassword} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /><Button className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "login" ? "Sign in" : "Register"}</Button></form>
    {message && <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{message}</p>}
    <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }} className="mt-5 text-sm font-semibold text-primary hover:underline">{mode === "login" ? "Need an account? Register" : "Already registered? Sign in"}</button>
  </div>;
}

function Field({ label, value, onChange, type, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type: string; autoComplete: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold">{label}</span><input required minLength={type === "password" ? 8 : undefined} type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary" /></label>;
}
