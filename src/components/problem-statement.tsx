import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import type { Problem } from "@/lib/types";

export function ProblemStatement({ problem }: { problem: Problem }) {
  return (
    <article className="prose-acsl px-5 py-6 sm:px-7">
      <div className="mb-6 flex flex-wrap gap-2"><Badge>{problem.division}</Badge><Badge>{problem.difficulty}</Badge><Badge>{problem.topic}</Badge><Badge>{problem.year}</Badge></div>
      <ReactMarkdown>{problem.statement}</ReactMarkdown>
      <Section title="Input"><ReactMarkdown>{problem.inputSpec}</ReactMarkdown></Section>
      <Section title="Output"><ReactMarkdown>{problem.outputSpec}</ReactMarkdown></Section>
      <Section title="Constraints"><ul className="space-y-2 text-sm text-muted-foreground">{problem.constraints.map((constraint) => <li key={constraint} className="font-mono">• {constraint}</li>)}</ul></Section>
      <Section title="Examples">{problem.samples.map((sample, index) => <div key={index} className="mb-6 grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Input</p><pre className="code-block">{sample.input}</pre></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Output</p><pre className="code-block">{sample.output}</pre></div>{sample.explanation && <div className="sm:col-span-2"><p className="mb-1 text-sm font-bold text-foreground">Explanation</p><ReactMarkdown>{sample.explanation}</ReactMarkdown></div>}</div>)}</Section>
      <Section title="Hints"><details className="rounded-xl border border-border bg-muted/40 p-4"><summary className="cursor-pointer font-semibold">Reveal {problem.hints.length} hints</summary><ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">{problem.hints.map((hint) => <li key={hint}>{hint}</li>)}</ol></details></Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>{children}</section>;
}
