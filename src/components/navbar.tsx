import Link from "next/link";
import { Braces, ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  ["Problems", "/problems"],
  ["Submissions", "/submissions"],
  ["Leaderboard", "/leaderboard"],
];

export async function Navbar() {
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const { data: profile } = supabase && data.user ? await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle() : { data: null };

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-7 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Braces className="h-5 w-5" /></span>
          <span>ACSL Practice</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {profile?.role === "admin" && <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Admin</Link>}
          <Link href="/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Profile</Link>
          <ThemeToggle />
          {data.user ? (
            <form action="/api/auth/signout" method="post">
              <button className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Sign out</button>
            </form>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>Sign in <ChevronRight className="h-3.5 w-3.5" /></Link>
          )}
        </div>
      </div>
    </header>
  );
}
