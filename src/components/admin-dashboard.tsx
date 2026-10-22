"use client";

import { FileJson, Loader2, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { defaultStarter } from "@/lib/starters";

const template = {
  slug: "new-problem",
  title: "New Problem",
  division: "Junior",
  difficulty: "Easy",
  topic: "Strings",
  year: 2026,
  acceptanceRate: 0,
  summary: "One-sentence summary.",
  statement: "Markdown problem statement.",
  inputSpec: "Describe the input.",
  outputSpec: "Describe the output.",
  constraints: ["1 ≤ N ≤ 100"],
  samples: [{ input: "", output: "", explanation: "" }],
  hints: [],
  starterCode: defaultStarter,
  timeLimitMs: 2000,
  memoryLimitKb: 128000,
  isPublished: false,
  tests: [{ input: "", expectedOutput: "", hidden: true }],
};

export function AdminDashboard() {
  const [problems, setProblems] = useState<Record<string, unknown>[]>([]);
  const [json, setJson] = useState(JSON.stringify(template, null, 2));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() { const response = await fetch("/api/admin/problems"); if (response.ok) setProblems(await response.json()); }
  useEffect(() => { void refresh(); }, []);

  async function save() {
    setLoading(true); setMessage("");
    try {
      const payload = JSON.parse(json);
      const response = await fetch("/api/admin/problems", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(`Saved ${result.length} problem${result.length === 1 ? "" : "s"}.`); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid JSON."); } finally { setLoading(false); }
  }

  function upload(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => setJson(String(reader.result)); reader.readAsText(file); }
  async function remove(id: string) { if (!confirm("Delete this problem and all of its test cases?")) return; const response = await fetch(`/api/admin/problems?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (response.ok) { setMessage("Problem deleted."); await refresh(); } else setMessage((await response.json()).error); }

  return <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="font-bold">Problem JSON</h2><p className="text-xs text-muted-foreground">One object or an array for bulk import.</p></div><div className="flex gap-2"><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"><Upload className="h-3.5 w-3.5" /> Import file<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => upload(event.target.files?.[0])} /></label><Button size="sm" onClick={save} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button></div></div><textarea spellCheck={false} value={json} onChange={(event) => setJson(event.target.value)} className="h-[650px] w-full resize-y bg-[#0c1020] p-5 font-mono text-xs leading-6 text-slate-200 outline-none" />{message && <p className="border-t border-border px-5 py-3 text-sm text-muted-foreground">{message}</p>}</Card><Card className="h-fit overflow-hidden"><div className="flex items-center gap-2 border-b border-border px-5 py-4"><FileJson className="h-4 w-4 text-primary" /><h2 className="font-bold">Database problems</h2></div>{problems.map((problem) => <div key={String(problem.id)} className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-0"><button className="min-w-0 text-left" onClick={() => setJson(JSON.stringify(problem, null, 2))}><span className="block truncate text-sm font-semibold">{String(problem.title)}</span><span className="text-xs text-muted-foreground">/{String(problem.slug)}</span></button><Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-danger" onClick={() => remove(String(problem.id))}><Trash2 className="h-4 w-4" /></Button></div>)}{!problems.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No database-authored problems.</p>}</Card></div>;
}
