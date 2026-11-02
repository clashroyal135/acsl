"use client";

import Link from "next/link";
import { Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm({ canReset }: { canReset: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password !== confirmation) { setMessage("Passwords do not match."); return; }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) { setMessage("Password reset is not available yet."); return; }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage(error.message); return; }
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch {
      setMessage("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-soft">
      <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" /></span>
      <h1 className="text-2xl font-black">{complete ? "Password updated" : "Reset your password"}</h1>
      {complete ? <>
        <p role="status" className="mt-3 text-sm text-muted-foreground">Your new password is saved. You can use it the next time you sign in.</p>
        <Link href="/problems" className={buttonVariants({ className: "mt-6 w-full" })}>Continue to problems</Link>
      </> : !canReset ? <>
        <p role="status" className="mt-3 text-sm text-muted-foreground">This password reset link is invalid or has expired. Request a new link and open it in the same browser.</p>
        <Link href="/login?mode=forgot" className={buttonVariants({ className: "mt-6 w-full" })}>Request a new reset link</Link>
      </> : <>
        <p className="mt-2 text-sm text-muted-foreground">Choose a new password with at least 8 characters.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <fieldset disabled={loading} className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">New password</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Confirm new password</span><input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary" /></label>
            <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save new password</Button>
          </fieldset>
        </form>
        {message && <p role="status" className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{message}</p>}
      </>}
    </div>
  );
}
