"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ oauthError = false }: { oauthError?: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState(oauthError ? "Google sign-in could not be completed." : "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithGoogle() {
    setLoading(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setMessage("Google sign-in needs to be configured by the site administrator."); setLoading(false); return; }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setMessage(error.message); setLoading(false); }
  }

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
    <Button type="button" variant="outline" className="mt-6 w-full" onClick={signInWithGoogle} disabled={loading}><GoogleIcon /> Continue with Google</Button>
    <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or</span><span className="h-px flex-1 bg-border" /></div>
    <form onSubmit={submit} className="space-y-4">{mode === "register" && <Field label="Display name" value={name} onChange={setName} type="text" autoComplete="name" />}<Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" /><Field label="Password" value={password} onChange={setPassword} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /><Button className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "login" ? "Sign in" : "Register"}</Button></form>
    {message && <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{message}</p>}
    <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }} className="mt-5 text-sm font-semibold text-primary hover:underline">{mode === "login" ? "Need an account? Register" : "Already registered? Sign in"}</button>
  </div>;
}

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.54c-.9.6-2.05.97-3.38.97-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.87A6.01 6.01 0 0 1 6.08 12c0-.65.11-1.28.32-1.87V7.51H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.49l3.35-2.62Z"/><path fill="#EA4335" d="M12 6c1.47 0 2.78.5 3.82 1.49l2.86-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.51l3.35 2.62C7.19 7.76 9.4 6 12 6Z"/></svg>;
}

function Field({ label, value, onChange, type, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type: string; autoComplete: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold">{label}</span><input required minLength={type === "password" ? 8 : undefined} type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary" /></label>;
}
