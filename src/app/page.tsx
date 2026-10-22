import Link from "next/link";
import { ArrowRight, Braces, Code2, Gauge, ShieldCheck, Sparkles, TerminalSquare, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAllProblems } from "@/lib/database.server";

export default async function HomePage() {
  const problems = await getAllProblems();

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_15%,hsl(var(--primary)/.15),transparent_34%),linear-gradient(to_bottom,hsl(var(--card)),hsl(var(--background)))]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div className="flex flex-col justify-center">
            <Badge className="mb-6 w-fit border-primary/25 bg-primary/10 text-primary"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Built for ACSL competitors</Badge>
            <h1 className="max-w-3xl text-5xl font-black tracking-[-0.045em] sm:text-6xl lg:text-7xl">Train your logic. <span className="text-primary">Prove it in code.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">A focused practice arena for Junior, Intermediate, and Senior ACSL programmers. Solve original problems in Python, Java, or C++ and get precise, sandboxed feedback.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/problems" className={cn(buttonVariants({ size: "lg" }))}>Explore problems <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/about" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>How ACSL works</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{problems.length}</strong> original challenges</span>
              <span><strong className="text-foreground">3</strong> divisions</span>
              <span><strong className="text-foreground">3</strong> languages</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 -z-10 rounded-full bg-primary/10 blur-3xl" />
            <Card className="overflow-hidden border-border/70 bg-card/90">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-warning/70" /><span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-3 text-xs font-semibold text-muted-foreground">letter_relay.py</span>
              </div>
              <pre className="overflow-hidden p-6 font-mono text-sm leading-7"><code><span className="text-primary">def</span> <span className="text-sky-500">encode</span>(word, shift):{"\n"}    <span className="text-primary">return</span> <span className="text-warning">&quot;&quot;</span>.join({"\n"}        chr((ord(c) - <span className="text-warning">65</span> + shift) % <span className="text-warning">26</span> + <span className="text-warning">65</span>){"\n"}        <span className="text-primary">for</span> c <span className="text-primary">in</span> word{"\n"}    )</code></pre>
              <div className="m-4 mt-0 flex items-center justify-between rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm"><span className="font-semibold text-success">Accepted</span><span className="text-muted-foreground">3 / 3 tests · 0.03s</span></div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-primary">Practice with purpose</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Everything between the problem and the breakthrough.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            [TerminalSquare, "Real execution", "Run against Judge0—not a simulated console."],
            [Gauge, "Useful feedback", "See verdicts, timing, memory, and diagnostics."],
            [ShieldCheck, "Secure grading", "Hidden cases and judging logic stay server-side."],
            [Trophy, "Visible progress", "Track solves by division and climb the leaderboard."],
          ].map(([Icon, title, copy]) => (
            <Card key={String(title)} className="p-6">
              <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <h3 className="font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(copy)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {[
            ["01", "Choose your level", "Filter original challenges by Junior, Intermediate, Senior, topic, or difficulty."],
            ["02", "Build your solution", "Use the VS Code editor experience with autosave, starter templates, and custom input."],
            ["03", "Submit with confidence", "Your code runs in an isolated judge against public and hidden test cases."],
          ].map(([number, title, copy]) => <div key={number} className="flex gap-4"><span className="font-mono text-sm font-bold text-primary">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></div></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
        <Braces className="mx-auto h-8 w-8 text-primary" /><h2 className="mt-4 text-3xl font-black tracking-tight">Ready for the next contest?</h2><p className="mx-auto mt-3 max-w-xl text-muted-foreground">Start with a five-minute warm-up or tackle a Senior graph problem.</p>
        <Link href="/problems" className={cn(buttonVariants({ size: "lg" }), "mt-7")}>Start solving <Code2 className="h-4 w-4" /></Link>
      </section>
    </main>
  );
}
