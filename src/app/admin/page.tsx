import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin.server";

export const metadata: Metadata = { title: "Admin" };
export default async function AdminPage() {
  if (!await requireAdmin()) return <main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-3xl font-black">Administrator access required</h1><p className="mt-3 text-muted-foreground">Sign in with an administrator account to manage problems and review student progress.</p><Link href="/login" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Sign in</Link></main>;
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Administration</p><h1 className="mt-2 text-4xl font-black tracking-tight">Admin dashboard</h1><p className="mt-3 text-muted-foreground">Manage your problem library and review every student’s progress and submitted code.</p><AdminDashboard /></main>;
}
