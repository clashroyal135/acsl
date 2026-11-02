"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginEmail } from "@/lib/login-identity";

type Mode = "login" | "register" | "forgot";

export function LoginForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) { setMessage("Sign-in is not available yet."); return; }
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/api/auth/reset-password`,
        });
        setMessage(error ? error.message : "If an account exists for this email, you’ll receive a password reset link. Check your inbox and spam folder.");
      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(email), password });
        if (error) setMessage(error.message);
        else {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
          router.push(profile?.role === "admin" ? "/admin" : "/problems");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
        setMessage(error ? error.message : "Account created. Check your email if confirmation is enabled.");
      }
    } catch {
      setMessage("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const action = mode === "login" ? "Sign in" : mode === "register" ? "Register" : "Send reset link";

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-soft">
      <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" /></span>
      <h1 className="text-2xl font-black">{mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Reset your password"}</h1>
      {mode === "forgot" && <p className="mt-2 text-sm text-muted-foreground">Enter your account email and we’ll send you a password reset link. Open it in this browser.</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <fieldset disabled={loading} className="space-y-4">
          {mode === "register" && <Field label="Display name" value={name} onChange={setName} type="text" autoComplete="name" />}
          <Field label={mode === "login" ? "Email or admin username" : "Email"} value={email} onChange={setEmail} type={mode === "login" ? "text" : "email"} autoComplete={mode === "login" ? "username" : "email"} />
          {mode !== "forgot" && <Field label="Password" value={password} onChange={setPassword} type="password" minLength={mode === "login" ? 6 : 8} autoComplete={mode === "login" ? "current-password" : "new-password"} />}
          {mode === "login" && <div className="text-right"><button type="button" onClick={() => changeMode("forgot")} className="rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Forgot password?</button></div>}
          <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{action}</Button>
        </fieldset>
      </form>
      {message && <p role="status" className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{message}</p>}
      <button type="button" disabled={loading} onClick={() => changeMode(mode === "login" ? "register" : "login")} className="mt-5 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{mode === "login" ? "Need an account? Register" : mode === "forgot" ? "Back to sign in" : "Already registered? Sign in"}</button>
    </div>
  );
}

function Field({ label, value, onChange, type, autoComplete, minLength }: { label: string; value: string; onChange: (value: string) => void; type: string; autoComplete: string; minLength?: number }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold">{label}</span><input required minLength={minLength} type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary" /></label>;
}
