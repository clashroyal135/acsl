import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAllProblems } from "@/lib/database.server";

export default async function HomePage() {
  const problems = await getAllProblems();

  return (
    <main>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <h1 className="max-w-3xl text-5xl font-black tracking-[-0.045em] sm:text-6xl">ACSL programming practice.</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">Solve problems in Python, Java, or C++ and submit them for automatic grading.</p>
          <Link href="/problems" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>Browse problems <ArrowRight className="h-4 w-4" /></Link>
          <div className="mt-10 flex gap-6 text-sm text-muted-foreground"><span><strong className="text-foreground">{problems.length}</strong> problems</span><span><strong className="text-foreground">3</strong> divisions</span><span><strong className="text-foreground">3</strong> languages</span></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold">Divisions</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[["Junior", "Strings, arithmetic, and simulation."], ["Intermediate", "Data structures, logic, and algorithms."], ["Senior", "Graphs, grids, and advanced algorithms."]].map(([title, copy]) => <Card key={title} className="p-5"><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{copy}</p></Card>)}
        </div>
      </section>
    </main>
  );
}
