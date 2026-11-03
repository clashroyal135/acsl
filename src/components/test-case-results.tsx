"use client";

import { CheckCircle2, Clock3, MemoryStick, XCircle } from "lucide-react";
import Link from "next/link";
import type { ExecutionResult, SampleCase, TestCaseDetails } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TestCaseResults({ samples, result, running, custom = false, submitted = false }: {
  samples: SampleCase[]; result: ExecutionResult | null; running: boolean; custom?: boolean; submitted?: boolean;
}) {
  const cases: TestCaseDetails[] = result?.cases ?? (custom ? [] : samples.map((sample, index) => ({ index, hidden: false, input: sample.input, expectedOutput: sample.output })));
  const outcomes = new Map(result?.tests.map((test) => [test.index, test]));
  let sampleNumber = 0, hiddenNumber = 0;
  return <div className="space-y-4">
    {result && <div role="status" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn("flex items-center gap-2 rounded-lg font-bold", result.verdict === "Accepted" ? "text-success" : result.verdict === "In progress" ? "bg-warning/10 px-3 py-2 text-warning" : "text-danger")}>
          {result.verdict === "Accepted" ? <CheckCircle2 className="h-5 w-5" /> : result.verdict === "In progress" ? <Clock3 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {custom && result.verdict === "Accepted" ? "Finished" : result.verdict}
          {!custom && <span className="text-xs font-normal text-muted-foreground">{result.passed}/{result.total} passed</span>}
        </p>
        <div className="flex gap-4 text-xs text-muted-foreground">{result.time != null && <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{result.time.toFixed(3)}s</span>}{result.memory != null && <span className="flex items-center gap-1"><MemoryStick className="h-3.5 w-3.5" />{Math.round(result.memory / 1000)} MB</span>}</div>
      </div>
      {submitted && <p className="text-sm text-muted-foreground">{result.saved ? <>Submission saved. <Link href="/submissions" className="font-semibold text-primary hover:underline">View submitted solutions</Link></> : <><Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link> to save your submitted code.</>}</p>}
    </div>}
    {cases.map((test) => {
      const outcome = outcomes.get(test.index);
      const passed = outcome?.verdict === "Accepted";
      const label = custom ? "Custom case" : test.hidden ? `Hidden test ${++hiddenNumber}` : `Sample case ${++sampleNumber}`;
      const status = running ? "Running…" : !outcome ? "Not run" : passed ? custom ? "Finished" : "Passed" : outcome.verdict;
      return <section key={test.index} aria-label={label} className={cn("rounded-xl border p-4", !outcome ? "border-border bg-muted/20" : passed ? "border-success/40 bg-success/5" : "border-danger/40 bg-danger/5")}>
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{label}</h3><span className={cn("text-xs font-semibold", outcome ? passed ? "text-success" : "text-danger" : "text-muted-foreground")}>{status}</span></div>
        {test.hidden ? <CaseText label={`${label} result`} value={outcome ? passed ? "Passed" : outcome.verdict : status} /> : <div className="grid gap-3 sm:grid-cols-2">
          <CaseText label={`${label} input`} value={test.input ?? ""} />
          {!custom && <CaseText label={`${label} expected output`} value={test.expectedOutput ?? ""} />}
          {outcome && <div className="sm:col-span-2"><CaseText label={`${label} your output`} value={outcome.stdout ?? (passed ? "" : "Output unavailable. Run the samples separately to inspect your output.")} /></div>}
        </div>}
        {!test.hidden && outcome?.compileOutput && <div className="mt-3"><CaseText label={`${label} compiler`} value={outcome.compileOutput} /></div>}
        {!test.hidden && outcome?.stderr && <div className="mt-3"><CaseText label={`${label} error`} value={outcome.stderr} /></div>}
      </section>;
    })}
  </div>;
}

function CaseText({ label, value }: { label: string; value: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span><textarea aria-label={label} readOnly spellCheck={false} value={value} rows={Math.min(6, Math.max(2, value.trimEnd().split("\n").length))} className="w-full resize-y rounded-lg border border-border bg-background/80 p-3 font-mono text-xs leading-5 outline-none focus:ring-2 focus:ring-primary" /></label>;
}
