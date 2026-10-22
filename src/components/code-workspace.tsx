"use client";

import Editor from "@monaco-editor/react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, Clock3, Code2, Loader2, LockKeyhole, MemoryStick, Play, Send, Terminal, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProblemStatement } from "@/components/problem-statement";
import { Button } from "@/components/ui/button";
import { splitStarterCode } from "@/lib/starters";
import type { Language, Problem, SubmissionResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const languageLabels: Record<Language, string> = { python: "Python 3", cpp: "C++17", java: "Java 17" };
const monacoLanguages: Record<Language, string> = { python: "python", cpp: "cpp", java: "java" };

export function CodeWorkspace({ problem }: { problem: Problem }) {
  const templates = useMemo(() => ({
    python: splitStarterCode(problem.starterCode.python),
    cpp: splitStarterCode(problem.starterCode.cpp),
    java: splitStarterCode(problem.starterCode.java),
  }), [problem.starterCode]);
  const initialBodies = useMemo<Record<Language, string>>(() => ({
    python: templates.python.editable,
    cpp: templates.cpp.editable,
    java: templates.java.editable,
  }), [templates]);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(initialBodies.python);
  const [mode, setMode] = useState<"sample" | "custom">("sample");
  const [customInput, setCustomInput] = useState("");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState<"run" | "submit" | null>(null);
  const [leftWidth, setLeftWidth] = useState(43);
  const [dark, setDark] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const codesRef = useRef<Record<Language, string>>({ ...initialBodies });

  useEffect(() => {
    const key = `acsl-function-v3:${problem.slug}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) codesRef.current = { ...codesRef.current, ...JSON.parse(stored) };
      setCode(codesRef.current[language]);
    } catch { /* Ignore invalid local drafts. */ }
  }, [problem.slug, language]);

  useEffect(() => {
    const blockClipboard = (event: ClipboardEvent) => event.preventDefault();
    const blockDrop = (event: DragEvent) => event.preventDefault();
    const blockClipboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["c", "v", "x"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const blockPasteInput = (event: InputEvent) => {
      if (event.inputType === "insertFromPaste" || event.inputType === "insertFromDrop") event.preventDefault();
    };
    document.addEventListener("copy", blockClipboard, true);
    document.addEventListener("cut", blockClipboard, true);
    document.addEventListener("paste", blockClipboard, true);
    document.addEventListener("drop", blockDrop, true);
    document.addEventListener("keydown", blockClipboardShortcut, true);
    document.addEventListener("beforeinput", blockPasteInput, true);
    return () => {
      document.removeEventListener("copy", blockClipboard, true);
      document.removeEventListener("cut", blockClipboard, true);
      document.removeEventListener("paste", blockClipboard, true);
      document.removeEventListener("drop", blockDrop, true);
      document.removeEventListener("keydown", blockClipboardShortcut, true);
      document.removeEventListener("beforeinput", blockPasteInput, true);
    };
  }, []);

  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const saveCode = useCallback((value: string | undefined) => {
    const next = value ?? "";
    setCode(next);
    codesRef.current[language] = next;
    localStorage.setItem(`acsl-function-v3:${problem.slug}`, JSON.stringify(codesRef.current));
  }, [language, problem.slug]);

  function changeLanguage(next: Language) {
    codesRef.current[language] = code;
    setLanguage(next);
    setCode(codesRef.current[next]);
    setResult(null);
  }

  async function execute(kind: "run" | "submit") {
    setRunning(kind); setError(""); setResult(null);
    try {
      const template = templates[language];
      const submissionCode = `${template.prefix}${code}${template.suffix}`;
      const response = await fetch(kind === "run" ? "/api/run" : "/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemSlug: problem.slug, code: submissionCode, language, mode, customInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The judge could not process this request.");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The judge could not process this request.");
    } finally { setRunning(null); }
  }

  function beginResize(event: React.PointerEvent) {
    event.preventDefault();
    const move = (moveEvent: PointerEvent) => {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      setLeftWidth(Math.min(65, Math.max(28, ((moveEvent.clientX - box.left) / box.width) * 100)));
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop);
  }

  const firstTest = result?.tests[0];
  const passed = result?.verdict === "Accepted";
  const activeTemplate = templates[language];

  return (
    <main className="bg-muted/45 p-2 sm:p-3">
      <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
        <div className="flex min-w-0 items-center gap-3"><Link href="/problems" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-muted" aria-label="Back to problems"><ChevronLeft className="h-4 w-4" /></Link><div className="min-w-0"><h1 className="truncate text-sm font-bold sm:text-base">{problem.title}</h1><p className="text-xs text-muted-foreground">{problem.division} · {problem.difficulty} · {problem.topic}</p></div></div>
        <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex"><span>{problem.timeLimitMs / 1000}s</span><span>{Math.round(problem.memoryLimitKb / 1000)} MB</span></div>
      </div>
      <div ref={containerRef} className="desktop-split grid min-h-[calc(100vh-9.25rem)] overflow-hidden rounded-xl border border-border bg-card" style={{ gridTemplateColumns: `${leftWidth}% 6px minmax(0, 1fr)` }}>
        <section className="min-w-0 overflow-y-auto border-b border-border md:border-b-0"><ProblemStatement problem={problem} /></section>
        <button className="desktop-resizer cursor-col-resize bg-border transition-colors hover:bg-primary" onPointerDown={beginResize} aria-label="Resize problem and editor panels" />
        <section className="flex min-w-0 flex-col bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-muted-foreground" /><span className="relative"><select value={language} onChange={(event) => changeLanguage(event.target.value as Language)} className="block h-8 appearance-none rounded-md border border-border bg-background py-0 pl-2 pr-7 text-xs font-semibold leading-[1.875rem] outline-none">{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /></span><span className="hidden text-xs text-muted-foreground sm:inline">Complete the function · Copy/paste disabled</span></div>
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => execute("run")} disabled={Boolean(running)}>{running === "run" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run</Button><Button size="sm" onClick={() => execute("submit")} disabled={Boolean(running)}>{running === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit</Button></div>
          </div>
          <div className="h-[58vh] min-h-[420px] overflow-y-auto border-b border-border md:flex-1">
            <LockedCode label="Locked setup" code={activeTemplate.prefix} />
            <div className="flex items-center justify-between border-y border-primary/20 bg-primary/5 px-3 py-2 text-xs"><span className="font-bold text-primary">Your function body</span><span className="text-muted-foreground">Editable</span></div>
            <div className="h-[300px] min-h-[240px]">
              <Editor height="100%" language={monacoLanguages[language]} value={code} onChange={saveCode} theme={dark ? "vs-dark" : "light"} onMount={(editor, monaco) => editor.onKeyDown((event) => { if ((event.ctrlKey || event.metaKey) && [monaco.KeyCode.KeyC, monaco.KeyCode.KeyV, monaco.KeyCode.KeyX].includes(event.keyCode)) { event.preventDefault(); event.stopPropagation(); } })} options={{ minimap: { enabled: false }, fontSize: 14, lineHeight: 22, padding: { top: 14, bottom: 14 }, automaticLayout: true, scrollBeyondLastLine: false, tabSize: 4, bracketPairColorization: { enabled: true }, wordWrap: "on", contextmenu: false, dragAndDrop: false, scrollbar: { alwaysConsumeMouseWheel: false } }} />
            </div>
            <LockedCode label="Locked runner" code={activeTemplate.suffix} />
          </div>
          <div className="min-h-[260px] max-h-[40vh] overflow-y-auto">
            <div className="flex border-b border-border px-3 pt-2"><button onClick={() => setMode("sample")} className={cn("border-b-2 px-3 py-2 text-xs font-semibold", mode === "sample" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>Sample case</button><button onClick={() => setMode("custom")} className={cn("border-b-2 px-3 py-2 text-xs font-semibold", mode === "custom" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>Custom input</button></div>
            <div className="p-4">
              {mode === "custom" && !result && !error && <textarea value={customInput} onChange={(event) => setCustomInput(event.target.value)} className="h-32 w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Enter stdin here…" />}
              {mode === "sample" && !result && !error && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Input</p><pre className="code-block max-h-40">{problem.samples[0]?.input}</pre></div>}
              {running && <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Waiting for the isolated judge…</div>}
              {error && <div className="flex gap-3 rounded-xl border border-danger/25 bg-danger/10 p-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" /><div><p className="font-semibold text-danger">Execution unavailable</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></div></div>}
              {result && <div>
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2">{passed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}<span className={cn("font-bold", passed ? "text-success" : "text-danger")}>{mode === "custom" && passed ? "Finished" : result.verdict}</span><span className="text-xs text-muted-foreground">{result.passed}/{result.total} tests</span></div><div className="flex gap-4 text-xs text-muted-foreground">{result.time != null && <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{result.time.toFixed(3)}s</span>}{result.memory != null && <span className="flex items-center gap-1"><MemoryStick className="h-3.5 w-3.5" />{Math.round(result.memory / 1000)} MB</span>}</div></div>
                {firstTest && <div className="mt-4 grid gap-3 sm:grid-cols-2"><OutputBlock label="Your output" value={firstTest.stdout ?? "(no output)"} />{firstTest.expectedOutput !== undefined && <OutputBlock label="Expected" value={firstTest.expectedOutput} />}{firstTest.compileOutput && <div className="sm:col-span-2"><OutputBlock label="Compiler" value={firstTest.compileOutput} danger /></div>}{firstTest.stderr && <div className="sm:col-span-2"><OutputBlock label="Error" value={firstTest.stderr} danger /></div>}</div>}
              </div>}
              {!result && !error && !running && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Terminal className="h-3.5 w-3.5" /> Run code to see stdout, errors, time, and memory.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function LockedCode({ label, code }: { label: string; code: string }) {
  if (!code.trim()) return null;
  return <div className="select-none bg-muted/35"><div className="flex items-center gap-2 border-b border-border/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />{label}<span className="ml-auto normal-case tracking-normal">Read only</span></div><pre className="overflow-x-auto p-3 font-mono text-xs leading-[22px] text-muted-foreground">{code}</pre></div>;
}

function OutputBlock({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div><p className={cn("mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground", danger && "text-danger")}>{label}</p><pre className="code-block max-h-40">{value}</pre></div>;
}
