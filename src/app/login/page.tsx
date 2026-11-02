import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-12"><LoginForm initialMode={mode === "forgot" ? "forgot" : "login"} /></main>;
}
