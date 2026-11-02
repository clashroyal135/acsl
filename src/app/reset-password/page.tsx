import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const result = !error && supabase ? await supabase.auth.getUser() : null;
  const canReset = Boolean(result?.data.user && !result.error);

  return <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-12"><ResetPasswordForm canReset={canReset} /></main>;
}
