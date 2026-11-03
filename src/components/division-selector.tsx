"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { DIVISIONS, type ProblemVersion } from "@/lib/problem-groups";

export function DivisionSelector({ currentSlug, versions }: { currentSlug: string; versions: ProblemVersion[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <label className="flex shrink-0 items-center gap-2 text-xs font-semibold">
    <span className="sr-only sm:not-sr-only">Division</span>
    <span className="relative">
      <select aria-label="Problem division" disabled={pending} value={currentSlug} onChange={(event) => {
        const slug = event.target.value;
        if (slug !== currentSlug && versions.some((version) => version.slug === slug)) startTransition(() => router.push(`/problems/${slug}`));
      }} className="h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-60">
        {DIVISIONS.map((division) => {
          const version = versions.find((item) => item.division === division);
          return <option key={division} value={version?.slug ?? `unavailable-${division}`} disabled={!version}>{division}{!version ? " (unavailable)" : ""}</option>;
        })}
      </select>
      {pending ? <Loader2 aria-hidden="true" className="pointer-events-none absolute right-2 top-3 h-3.5 w-3.5 animate-spin" /> : <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-3 h-3.5 w-3.5" />}
    </span>
    {pending && <span role="status" className="sr-only">Loading division…</span>}
  </label>;
}
