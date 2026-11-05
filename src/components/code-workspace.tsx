"use client";

import Editor from "@monaco-editor/react";
import { AlertCircle, ChevronDown, ChevronLeft, Code2, Loader2, Play, Send } from "lucide-react";
import type { editor as MonacoEditor } from "monaco-editor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DivisionSelector } from "@/components/division-selector";
import { seasonLabel, type ProblemVersion } from "@/lib/problem-groups";
import { ProblemStatement } from "@/components/problem-statement";
import { Button } from "@/components/ui/button";
import { trackLockedCode } from "@/lib/editor-locks";
import { TestCaseResults } from "@/components/test-case-results";
import { restoreStarterDraft, splitStarterCode } from "@/lib/starters";
import type { Language, Problem, ExecutionResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const languageLabels: Record<Language, string> = { python: "Python 3", cpp: "C++17", java: "Java 17" };
const monacoLanguages: Record<Language, string> = { python: "python", cpp: "cpp", java: "java" };

type Action = "sample" | "all" | "custom" | "submit";

export function CodeWorkspace({ problem, isAdmin = false, versions = [problem], preferredLanguage = "python" }: { problem: Problem; isAdmin?: boolean; versions?: ProblemVersion[]; preferredLanguage?: Language }) {
  const router = useRouter();
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
  const [language, setLanguage] = useState<Language>(preferredLanguage);
  const [code, setCode] = useState(initialBodies[preferredLanguage]);
  const [mode, setMode] = useState<"sample" | "custom">("sample");
  const [customInput, setCustomInput] = useState("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState<Action | null>(null);
  const [lastAction, setLastAction] = useState<Action>("sample");
  const [leftWidth, setLeftWidth] = useState(43);
  const [codeHeight, setCodeHeight] = useState(56);
  const [dark, setDark] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLElement>(null);
  const codesRef = useRef<Record<Language, string>>({ ...initialBodies });
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const lockedCodeRef = useRef<ReturnType<typeof trackLockedCode> | null>(null);
  const templateRef = useRef(templates[language]);
  templateRef.current = templates[language];
  const internalClipboardRef = useRef("");

  useEffect(() => {
    const key = `acsl-function-v3:${problem.slug}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const drafts = JSON.parse(stored);
        for (const key of ["python", "cpp", "java"] as const) {
          if (typeof drafts?.[key] === "string") codesRef.current[key] = restoreStarterDraft(key, drafts[key], initialBodies[key]);
        }
      }
      setCode(codesRef.current[language]);
    } catch { /* Ignore invalid local drafts. */ }
  }, [problem.slug, language, initialBodies]);

  useEffect(() => {
    if (isAdmin) return;
    const handleClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const target = event.target;
      const insideEditor = target instanceof Element && Boolean(target.closest(".acsl-code-cell"));
      if (!insideEditor) return;

      const editor = editorRef.current;
      const model = editor?.getModel();
      const selection = editor?.getSelection();
      if (!editor || !model || !selection) return;

      if (event.type === "copy" || event.type === "cut") {
        if (selection.isEmpty()) return;
        internalClipboardRef.current = model.getValueInRange(selection);
        if (event.type === "cut") {
          editor.executeEdits("acsl-internal-cut", [{ range: selection, text: "", forceMoveMarkers: true }]);
        }
        return;
      }

      if (event.type === "paste" && internalClipboardRef.current) {
        editor.executeEdits("acsl-internal-paste", [{ range: selection, text: internalClipboardRef.current, forceMoveMarkers: true }]);
      }
    };
    const blockDrop = (event: DragEvent) => event.preventDefault();
    document.addEventListener("copy", handleClipboard, true);
    document.addEventListener("cut", handleClipboard, true);
    document.addEventListener("paste", handleClipboard, true);
    document.addEventListener("drop", blockDrop, true);
    return () => {
      document.removeEventListener("copy", handleClipboard, true);
      document.removeEventListener("cut", handleClipboard, true);
      document.removeEventListener("paste", handleClipboard, true);
      document.removeEventListener("drop", blockDrop, true);
    };
  }, [isAdmin]);

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

  async function execute(kind: Action) {
    const submissionCode = `${templates[language].prefix}${code}${templates[language].suffix}`;
    setRunning(kind); setLastAction(kind); setMode(kind === "custom" ? "custom" : "sample"); setError(""); setResult(null);
    try {
      const response = await fetch(kind === "submit" ? "/api/submit" : "/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemSlug: problem.slug, code: submissionCode, language, mode: kind === "submit" ? "all" : kind, customInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The judge could not process this request.");
      setResult(data);
      if (kind === "submit" && data.saved) router.refresh();
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

  function beginHorizontalResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const box = rightPanelRef.current?.getBoundingClientRect();
      if (box) setCodeHeight(Math.min(78, Math.max(22, ((moveEvent.clientY - box.top - 49) / (box.height - 49)) * 100)));
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop);
  }

  const activeTemplate = templates[language];
  const fullCode = `${activeTemplate.prefix}${code}${activeTemplate.suffix}`;

  useEffect(() => { lockedCodeRef.current?.refresh(); }, [language, templates]);
  useEffect(() => () => { lockedCodeRef.current?.dispose(); }, []);

  const mountEditor = useCallback((editor: MonacoEditor.IStandaloneCodeEditor) => {
    lockedCodeRef.current?.dispose();
    editorRef.current = editor;
    lockedCodeRef.current = trackLockedCode(editor, () => templateRef.current);
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    const next = value ?? "";
    const { prefix, suffix } = templates[language];
    if (next.startsWith(prefix) && next.endsWith(suffix)) {
      const bodyEnd = suffix ? next.length - suffix.length : next.length;
      saveCode(next.slice(prefix.length, bodyEnd));
      return;
    }

    const editor = editorRef.current;
    if (editor && editor.getValue() !== fullCode) editor.setValue(fullCode);
  }, [fullCode, language, saveCode, templates]);

  return (
    <main className="flex flex-col bg-muted/45 p-2 sm:p-3 md:h-[calc(100dvh-4.0625rem)] md:min-h-0">
      <div className="mb-2 flex shrink-0 items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
        <div className="flex min-w-0 items-center gap-3"><Link href="/problems" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-muted" aria-label="Back to problems"><ChevronLeft className="h-4 w-4" /></Link><div className="min-w-0"><h1 className="truncate text-sm font-bold sm:text-base">{problem.title}</h1><p className="text-xs text-muted-foreground">{seasonLabel(problem.year)} · Contest 1</p></div></div>
        <DivisionSelector currentSlug={problem.slug} versions={versions} /><div className="hidden items-center gap-4 text-xs text-muted-foreground lg:flex"><span>{problem.timeLimitMs / 1000}s</span><span>{Math.round(problem.memoryLimitKb / 1000)} MB</span></div>
      </div>
      <div ref={containerRef} className="desktop-split grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card" style={{ gridTemplateColumns: `minmax(320px, ${leftWidth}%) 6px minmax(0, 1fr)` }}>
        <section aria-label="Problem statement" className="max-h-[40dvh] min-h-0 min-w-0 overflow-y-auto border-b border-border md:max-h-none md:border-b-0"><ProblemStatement problem={problem} /></section>
        <button className="desktop-resizer cursor-col-resize bg-border transition-colors hover:bg-primary" onPointerDown={beginResize} aria-label="Resize problem and editor panels" />
        <section ref={rightPanelRef} className="flex h-[calc(100dvh-8rem)] min-h-[480px] min-w-0 flex-col overflow-hidden bg-card md:h-full md:min-h-0">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-muted-foreground" /><span className="relative"><select value={language} aria-label="Programming language" disabled={Boolean(running)} onChange={(event) => changeLanguage(event.target.value as Language)} className="block h-8 appearance-none rounded-md border border-border bg-background py-0 pl-2 pr-7 text-xs font-semibold leading-[1.875rem] outline-none">{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /></span></div>
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => execute("sample")} disabled={Boolean(running)}>{running === "sample" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run</Button><Button size="sm" onClick={() => execute("submit")} disabled={Boolean(running)}>{running === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit</Button></div>
          </div>
          <div className="min-h-0 shrink-0 p-2" style={{ height: `calc((100% - 49px) * ${codeHeight / 100})` }}>
            <div className="acsl-code-cell h-full overflow-hidden rounded-lg border border-border bg-background shadow-inner">
              <Editor height="100%" language={monacoLanguages[language]} value={fullCode} onChange={handleEditorChange} theme={dark ? "vs-dark" : "light"} onMount={mountEditor} options={{ minimap: { enabled: false }, fontSize: 14, lineHeight: 22, lineNumbersMinChars: 3, padding: { top: 12, bottom: 12 }, automaticLayout: true, scrollBeyondLastLine: false, tabSize: 4, bracketPairColorization: { enabled: true }, wordWrap: "on", contextmenu: isAdmin, dragAndDrop: false, stickyScroll: { enabled: false }, scrollbar: { alwaysConsumeMouseWheel: false } }} />
            </div>
          </div>
          <button role="separator" aria-label="Resize code and test case panels" aria-orientation="horizontal" aria-valuemin={22} aria-valuemax={78} aria-valuenow={Math.round(codeHeight)} className="h-2 shrink-0 touch-none cursor-row-resize bg-border transition-colors hover:bg-primary focus-visible:bg-primary focus-visible:outline-none" onPointerDown={beginHorizontalResize} onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); setCodeHeight(value => Math.max(22, Math.min(78, value + (event.key === "ArrowUp" ? -3 : 3)))); } }} />
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 border-b border-border px-3 pt-2">{(["sample", "custom"] as const).map((tab) => <button key={tab} disabled={Boolean(running)} onClick={() => { setMode(tab); setResult(null); setError(""); }} className={cn("border-b-2 px-3 py-2 text-xs font-semibold disabled:opacity-60", mode === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>{tab === "sample" ? "Sample cases" : "Custom input"}</button>)}</div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {mode === "custom" && <div className="space-y-3"><textarea aria-label="Custom input" value={customInput} onChange={(event) => setCustomInput(event.target.value)} className="h-32 w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Enter stdin here…" /><Button size="sm" variant="secondary" disabled={Boolean(running)} onClick={() => execute("custom")}><Play className="h-3.5 w-3.5" /> Run custom input</Button></div>}
              {running && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />{running === "submit" ? "Submitting your solution…" : running === "all" ? "Running all test cases…" : running === "custom" ? "Running custom input…" : "Running sample cases…"}</p>}
              {error && <div role="alert" className="flex gap-3 rounded-xl border border-danger/25 bg-danger/10 p-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" /><p className="text-sm text-danger">{error}</p></div>}
              <TestCaseResults samples={problem.samples} result={result} running={Boolean(running)} custom={mode === "custom"} submitted={lastAction === "submit"} />
            </div>
            <div className="flex shrink-0 justify-end border-t border-border px-4 py-3"><Button size="sm" disabled={Boolean(running)} onClick={() => execute("all")}>{running === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run all test cases</Button></div>
          </div>
        </section>
      </div>
    </main>
  );
}
