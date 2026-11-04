"use client";

import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminProblemEditor } from "@/components/admin-problem-editor";
import { seasonLabel } from "@/lib/problem-groups";
import { defaultStarter } from "@/lib/starters";
import type { AdminProblem } from "@/lib/admin-types";

function newProblem(): AdminProblem {
  return { id: "", slug: "", title: "", division: "Junior", difficulty: "Easy", topic: "Strings", year: 2026,
    acceptanceRate: 0, summary: "", statement: "", inputSpec: "", outputSpec: "", constraints: [], hints: [],
    samples: [{ input: "", output: "", explanation: "" }], starterCode: { ...defaultStarter }, timeLimitMs: 2000,
    memoryLimitKb: 128000, isPublished: false, isBundled: false, tests: [{ input: "", expectedOutput: "", hidden: true }] };
}

export function AdminProblemsPanel() {
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [draft, setDraft] = useState<AdminProblem>(newProblem);
  const [editor, setEditor] = useState<"form" | "json">("form");
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh(signal?: AbortSignal) {
    const response = await fetch("/api/admin/problems", { cache: "no-store", signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load problems.");
    setProblems(result);
    return result as AdminProblem[];
  }
  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch((error) => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function edit(problem: AdminProblem) { setDraft(structuredClone(problem)); setEditor("form"); setMessage(""); setError(""); }
  function switchEditor(next: "form" | "json") {
    if (next === editor) return;
    try {
      if (next === "json") setJson(JSON.stringify(draft, null, 2));
      else {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) throw new Error("Use the JSON editor to save a bulk import.");
        if (!parsed || typeof parsed !== "object") throw new Error("Provide a problem object.");
        const candidate = { ...newProblem(), ...parsed };
        if (["id", "slug", "title", "division", "difficulty", "topic", "summary", "statement", "inputSpec", "outputSpec"].some((key) => typeof candidate[key] !== "string") ||
          ["year", "acceptanceRate", "timeLimitMs", "memoryLimitKb"].some((key) => typeof candidate[key] !== "number") ||
          typeof candidate.isPublished !== "boolean" ||
          !candidate.starterCode || ["python", "cpp", "java"].some((language) => typeof candidate.starterCode[language] !== "string") ||
          [candidate.constraints, candidate.hints].some((entries) => !Array.isArray(entries) || entries.some((entry: unknown) => typeof entry !== "string")) ||
          !Array.isArray(candidate.samples) || candidate.samples.some((sample: AdminProblem["samples"][number]) => !sample || typeof sample.input !== "string" || typeof sample.output !== "string" || (sample.explanation !== undefined && typeof sample.explanation !== "string")) ||
          !Array.isArray(candidate.tests) || candidate.tests.some((test: AdminProblem["tests"][number]) => !test || typeof test.input !== "string" || typeof test.expectedOutput !== "string" || typeof test.hidden !== "boolean")) throw new Error("Complete the problem structure before switching to the form.");
        setDraft(candidate);
      }
      setEditor(next); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "Invalid JSON."); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const payload = editor === "json" ? JSON.parse(json) : draft;
      const response = await fetch("/api/admin/problems", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save.");
      const updated = await refresh();
      if (result.length === 1) { const saved = updated.find((problem) => problem.id === result[0].id); if (saved) { setDraft(saved); setJson(JSON.stringify(saved, null, 2)); } }
      setMessage(`Saved ${result.length} problem${result.length === 1 ? "" : "s"}.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save."); }
    finally { setBusy(false); }
  }

  async function toggle(problem: AdminProblem) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/problems", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: problem.id, isPublished: !problem.isPublished }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await refresh();
      if (draft.id === problem.id) {
        setDraft((value) => ({ ...value, isPublished: result.isPublished }));
        if (editor === "json") {
          try { const value = JSON.parse(json); if (value && !Array.isArray(value) && value.id === problem.id) setJson(JSON.stringify({ ...value, isPublished: result.isPublished }, null, 2)); }
          catch { /* Keep unsaved JSON text when toggling a stored problem. */ }
        }
      }
      setMessage(`${problem.title} (${problem.division}) ${result.isPublished ? "published" : "unpublished"}.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to change publication status."); }
    finally { setBusy(false); }
  }

  async function remove(problem: AdminProblem) {
    if (!confirm(`Delete ${problem.title} and its test cases? Existing submission records will be kept.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/problems?id=${encodeURIComponent(problem.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error);
      await refresh(); if (draft.id === problem.id) edit(newProblem()); setMessage("Problem deleted.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to delete problem."); }
    finally { setBusy(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 10_000_000) { setError("Choose a JSON file smaller than 10 MB."); return; }
    try { setJson(await file.text()); setEditor("json"); setError(""); setMessage(""); }
    catch { setError("Unable to read this file."); }
  }

  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{problems.length} problems · {problems.filter((problem) => problem.isPublished).length} published</p>
      <Button onClick={() => edit(newProblem())} disabled={busy}><Plus className="h-4 w-4" /> Add problem</Button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg bg-success/10 p-3 text-sm text-success">{message}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <h2 className="border-b border-border px-5 py-4 font-bold">Problem library</h2>
        {loading ? <p role="status" className="p-6 text-sm text-muted-foreground">Loading problems…</p> : !problems.length ? <p className="p-6 text-sm text-muted-foreground">No problems yet.</p> : problems.map((problem) => <div key={problem.id} className={`border-b border-border p-4 last:border-0 ${draft.id === problem.id ? "bg-primary/5" : ""}`}>
          <button disabled={busy} className="w-full text-left hover:text-primary" onClick={() => edit(problem)}><span className="block font-semibold">{problem.title}</span><span className="text-xs text-muted-foreground">{seasonLabel(problem.year)} · {problem.division} · {problem.difficulty}</span></button>
          <div className="mt-3 flex flex-wrap items-center gap-2"><Badge className={problem.isPublished ? "border-success/25 bg-success/10 text-success" : ""}>{problem.isPublished ? "Published" : "Draft"}</Badge><Button size="sm" variant="outline" disabled={busy} onClick={() => toggle(problem)} aria-label={`${problem.isPublished ? "Unpublish" : "Publish"} ${problem.title} ${problem.division} ${seasonLabel(problem.year)}`}>{problem.isPublished ? "Unpublish" : "Publish"}</Button>{!problem.isBundled && <Button variant="ghost" size="icon" className="h-8 w-8 text-danger" disabled={busy} onClick={() => remove(problem)} aria-label={`Delete ${problem.title} ${problem.division} ${seasonLabel(problem.year)}`}><Trash2 className="h-4 w-4" /></Button>}</div>
        </div>)}
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><h2 className="font-bold">{draft.id ? "Edit problem" : "New problem"}</h2><div className="flex flex-wrap gap-2"><Button size="sm" variant={editor === "form" ? "secondary" : "ghost"} disabled={busy} onClick={() => switchEditor("form")}>Form</Button><Button size="sm" variant={editor === "json" ? "secondary" : "ghost"} disabled={busy} onClick={() => switchEditor("json")}>JSON</Button><label className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold ${busy ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}><Upload className="h-3.5 w-3.5" /> Import<input aria-label="Import problem JSON" type="file" accept="application/json,.json" disabled={busy} className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label></div></div>
        <form onSubmit={save}>
          <fieldset disabled={busy} className="min-w-0">
            {editor === "form" ? <AdminProblemEditor value={draft} onChange={setDraft} /> : <div className="p-5"><p className="mb-3 text-xs text-muted-foreground">One complete problem object, or an array for bulk import. Publication uses isPublished.</p><textarea aria-label="Problem JSON" spellCheck={false} value={json} onChange={(event) => setJson(event.target.value)} className="h-[650px] w-full rounded-lg bg-code p-4 font-mono text-xs leading-6 text-code-foreground outline-none focus:ring-2 focus:ring-primary" /></div>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5"><p className="text-xs text-muted-foreground">New problems start as drafts.</p><Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save problem</Button></div>
          </fieldset>
        </form>
      </Card>
    </div>
  </>;
}
