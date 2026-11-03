"use client";

import { ArrowLeft, Code2, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { seasonLabel } from "@/lib/problem-groups";
import type { AdminStudent, AdminSubmission, StudentDetail } from "@/lib/admin-types";

function date(value: string | null) { return value ? new Date(value).toLocaleString() : "Never"; }

export function AdminStudentsPanel() {
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/admin/students?page=${page}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load accounts.");
      setStudents(result.students); setTotal(result.total);
    }).catch((error) => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, reload]);

  if (selectedId) return <StudentReview key={selectedId} id={selectedId} onClose={() => { setSelectedId(null); setReload((value) => value + 1); }} />;
  return <Card className="overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="flex items-center gap-2 font-bold"><Users className="h-5 w-5 text-primary" /> Accounts & progress</h2><p className="mt-1 text-sm text-muted-foreground">All registered accounts, including students who haven’t submitted yet.</p></div><Button variant="outline" size="sm" disabled={loading} onClick={() => setReload((value) => value + 1)}>Refresh</Button></div>
    {error ? <div className="p-5"><p role="alert" className="text-sm text-danger">{error}</p></div> : loading ? <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…</p> : <>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Solved</th><th className="px-5 py-3">Submissions</th><th className="px-5 py-3">Last submission</th><th className="px-5 py-3"><span className="sr-only">Review</span></th></tr></thead><tbody>{students.map((student) => <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/30"><td className="px-5 py-4"><button className="text-left font-semibold hover:text-primary" onClick={() => setSelectedId(student.id)}>{student.displayName}</button><p className="mt-1 text-xs text-muted-foreground">{student.email}</p>{student.fullName && <p className="mt-1 text-xs text-muted-foreground">Full name: {student.fullName}</p>}<Badge className="mt-2">{student.role}</Badge></td><td className="px-5 py-4 font-semibold">{student.progress.solved_problem_ids.length}</td><td className="px-5 py-4">{student.progress.submission_count}</td><td className="px-5 py-4 text-xs text-muted-foreground">{date(student.progress.last_submission_at)}</td><td className="px-5 py-4"><Button size="sm" variant="outline" onClick={() => setSelectedId(student.id)} aria-label={`Review ${student.email}`}>View profile</Button></td></tr>)}</tbody></table></div>
      {!students.length && <p className="p-10 text-center text-sm text-muted-foreground">No registered accounts on this page.</p>}
      <Pagination page={page} total={total} pageSize={25} onChange={setPage} />
    </>}
  </Card>;
}

function StudentReview({ id, onClose }: { id: string; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [source, setSource] = useState<(AdminSubmission & { source_code: string }) | null>(null);
  const [sourceError, setSourceError] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/admin/students/${id}?page=${page}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load profile."); setDetail(result);
    }).catch((error) => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, page, reload]);
  useEffect(() => {
    if (!submissionId) { setSource(null); setSourceLoading(false); return; }
    const controller = new AbortController();
    setSource(null); setSourceError(""); setSourceLoading(true);
    fetch(`/api/admin/submissions/${submissionId}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to load code."); setSource(result);
    }).catch((error) => { if (!controller.signal.aborted) setSourceError(error.message); }).finally(() => { if (!controller.signal.aborted) setSourceLoading(false); });
    return () => controller.abort();
  }, [submissionId]);

  const problemNames = new Map(detail?.problems.map((problem) => [problem.id, `${problem.title} · ${seasonLabel(problem.year)} · ${problem.division}`]));
  const progress = detail?.student.progress;
  const knownIds = new Set(detail?.problems.map((problem) => problem.id));
  const problems = [...(detail?.problems ?? []), ...(progress?.attempted_problem_ids ?? []).filter((id) => !knownIds.has(id)).map((id) => ({ id, title: id, division: "Archived", year: null, isPublished: false }))];

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" onClick={onClose}><ArrowLeft className="h-4 w-4" /> All accounts</Button><Button size="sm" variant="outline" disabled={loading} onClick={() => setReload((value) => value + 1)}>Refresh profile</Button></div>
    {error ? <p role="alert" className="rounded-xl border border-danger/25 p-5 text-sm text-danger">{error}</p> : loading ? <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading profile…</p> : detail && progress && <>
      <Card className="p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div>{detail.student.avatarUrl && <img src={detail.student.avatarUrl} alt={`${detail.student.displayName}'s profile picture`} className="mb-4 h-20 w-20 rounded-2xl object-cover" />}<h2 className="text-2xl font-black">{detail.student.displayName}</h2><p className="mt-1 text-sm text-muted-foreground">{detail.student.email}</p><p className="mt-2 text-sm"><span className="font-semibold">Full name:</span> {detail.student.fullName || "Not provided"}{detail.student.fullName && !detail.student.showName && <span className="ml-2 text-xs text-muted-foreground">Hidden on public profile</span>}</p><p className="mt-3 text-xs text-muted-foreground">Joined {date(detail.student.createdAt)} · Last sign-in {date(detail.student.lastSignInAt)}</p></div><Badge>{detail.student.role}</Badge></div>{detail.student.aboutMe && <div className="mt-5 border-t border-border pt-4"><h3 className="text-sm font-semibold">About me</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{detail.student.aboutMe}</p></div>}<div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Problems solved", progress.solved_problem_ids.length], ["Problems attempted", progress.attempted_problem_ids.length], ["Submissions", progress.submission_count]].map(([label, count]) => <div key={label} className="rounded-xl bg-muted/60 p-4"><p className="text-2xl font-black">{count}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div></Card>
      <Card className="p-6"><h3 className="font-bold">Progress by problem</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{problems.map((problem) => { const solved = progress.solved_problem_ids.includes(problem.id); const attempted = progress.attempted_problem_ids.includes(problem.id); return <div key={problem.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div><p className="text-sm font-semibold">{problem.title}</p><p className="mt-1 text-xs text-muted-foreground">{problem.year ? `${seasonLabel(problem.year)} · ` : ""}{problem.division}{!problem.isPublished ? " · Unpublished" : ""}</p></div><Badge className={solved ? "border-success/25 bg-success/10 text-success" : ""}>{solved ? "Solved" : attempted ? "Attempted" : "Not started"}</Badge></div>; })}</div></Card>
      <Card className="overflow-hidden"><div className="border-b border-border p-5"><h3 className="font-bold">Submission history</h3><p className="mt-1 text-xs text-muted-foreground">Select a submission to read its saved source code.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Problem</th><th className="px-5 py-3">Verdict</th><th className="px-5 py-3">Tests</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3"><span className="sr-only">Code</span></th></tr></thead><tbody>{detail.submissions.map((submission) => <tr key={submission.id} className="border-b border-border last:border-0"><td className="px-5 py-4"><p className="font-semibold">{problemNames.get(submission.problem_id) ?? submission.problem_id}</p><p className="mt-1 font-mono text-xs uppercase text-muted-foreground">{submission.language}</p></td><td className="px-5 py-4"><Badge className={submission.verdict === "Accepted" ? "border-success/25 bg-success/10 text-success" : "border-danger/25 bg-danger/10 text-danger"}>{submission.verdict}</Badge></td><td className="px-5 py-4">{submission.passed_tests}/{submission.total_tests}</td><td className="px-5 py-4 text-xs text-muted-foreground">{date(submission.created_at)}</td><td className="px-5 py-4"><Button size="sm" variant={submissionId === submission.id ? "secondary" : "outline"} onClick={() => setSubmissionId(submission.id)} aria-label={`View ${submission.language} code submitted ${date(submission.created_at)}`}><Code2 className="h-4 w-4" /> View code</Button></td></tr>)}</tbody></table></div>{!detail.submissions.length && <p className="p-10 text-center text-sm text-muted-foreground">No submissions yet.</p>}<Pagination page={page} total={detail.total} pageSize={detail.pageSize} onChange={(next) => { setPage(next); setSubmissionId(null); }} /></Card>
    </>}
    {submissionId && <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h3 className="font-bold">Submitted code{source ? ` · ${problemNames.get(source.problem_id) ?? source.problem_id}` : ""}</h3>{source && <p className="mt-1 text-xs text-muted-foreground">{source.language} · {source.verdict} · {source.execution_time_ms ?? "—"} ms · {source.memory_kb ?? "—"} KB</p>}</div><Button size="sm" variant="ghost" onClick={() => setSubmissionId(null)}>Close code</Button></div>{sourceLoading ? <p role="status" className="p-5 text-sm text-muted-foreground">Loading code…</p> : sourceError ? <p role="alert" className="p-5 text-sm text-danger">{sourceError}</p> : source && <pre className="max-h-[650px] overflow-auto bg-[#0c1020] p-5 text-xs leading-6 text-slate-200" tabIndex={0} aria-label="Submitted source code"><code>{source.source_code}</code></pre>}</Card>}
  </div>;
}

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4"><p className="text-xs text-muted-foreground">{total} record{total === 1 ? "" : "s"} · Page {page} of {pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button></div></div>;
}
