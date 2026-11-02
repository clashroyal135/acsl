import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fromRow } from "@/lib/database.server";
import { problems as bundledProblems } from "@/lib/problems";
import { getBundledTests } from "@/lib/test-cases.server";
import type { AdminProblem } from "@/lib/admin-types";

export function bundledAdminProblems(): AdminProblem[] {
  return bundledProblems.map((problem) => ({
    ...problem,
    isPublished: true,
    isBundled: true,
    tests: problem.samples[0] ? getBundledTests(problem.slug, problem.samples[0].input, problem.samples[0].output) : [],
  }));
}

export async function getAdminProblems(admin: SupabaseClient): Promise<AdminProblem[]> {
  const { data, error } = await admin.from("problems").select("*, test_cases(*)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const merged = new Map(bundledAdminProblems().map((problem) => [problem.slug, problem]));
  for (const row of data ?? []) {
    merged.set(row.slug, {
      ...fromRow(row),
      isPublished: row.is_published,
      isBundled: bundledProblems.some((problem) => problem.slug === row.slug),
      tests: (row.test_cases ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position).map((test: { input: string; expected_output: string; is_hidden: boolean }) => ({ input: test.input, expectedOutput: test.expected_output, hidden: test.is_hidden })),
    });
  }
  return [...merged.values()];
}

export function problemToRow(problem: AdminProblem) {
  return {
    id: problem.id || undefined, slug: problem.slug, title: problem.title,
    division: problem.division, difficulty: problem.difficulty, topic: problem.topic, year: problem.year,
    acceptance_rate: problem.acceptanceRate, summary: problem.summary, statement: problem.statement,
    input_spec: problem.inputSpec, output_spec: problem.outputSpec, constraints: problem.constraints,
    samples: problem.samples, hints: problem.hints, starter_code: problem.starterCode,
    time_limit_ms: problem.timeLimitMs, memory_limit_kb: problem.memoryLimitKb, is_published: problem.isPublished,
  };
}

export function validateAdminProblem(value: unknown): AdminProblem {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Each problem must be an object.");
  const item = value as Record<string, unknown>;
  const text = (key: string, max = 100_000) => {
    const value = item[key];
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${key} is required and must be at most ${max} characters.`);
    return value;
  };
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = item[key] ?? fallback;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (key !== "acceptanceRate" && !Number.isInteger(value))) throw new Error(`${key} must be between ${min} and ${max}.`);
    return value;
  };
  const strings = (key: string): string[] => {
    const value = item[key] ?? [];
    if (!Array.isArray(value) || value.length > 100 || value.some((entry) => typeof entry !== "string" || entry.length > 5000)) throw new Error(`${key} must be an array of up to 100 strings.`);
    return value;
  };
  const slug = text("slug", 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug must use lowercase letters, numbers, and single hyphens.");
  if (typeof item.division !== "string" || !["Junior", "Intermediate", "Senior"].includes(item.division)) throw new Error("Choose a valid division.");
  if (typeof item.difficulty !== "string" || !["Easy", "Medium", "Hard"].includes(item.difficulty)) throw new Error("Choose a valid difficulty.");
  if (item.id !== undefined && (typeof item.id !== "string" || item.id.length > 120)) throw new Error("Invalid problem ID.");
  if (item.isPublished !== undefined && typeof item.isPublished !== "boolean") throw new Error("isPublished must be true or false.");
  const starter = item.starterCode as Record<string, unknown> | undefined;
  if (!starter || ["python", "cpp", "java"].some((key) => typeof starter[key] !== "string" || (starter[key] as string).length > 100_000)) throw new Error("Provide starter code for Python, C++, and Java.");
  if (!Array.isArray(item.samples) || item.samples.length > 100 || item.samples.some((sample) => !sample || typeof sample.input !== "string" || typeof sample.output !== "string" || sample.input.length > 100_000 || sample.output.length > 100_000 || (sample.explanation !== undefined && (typeof sample.explanation !== "string" || sample.explanation.length > 10_000)))) throw new Error("Provide valid sample inputs and outputs.");
  const samples = item.samples as AdminProblem["samples"];
  const tests = item.tests ?? samples.map((sample) => ({ input: sample.input, expectedOutput: sample.output, hidden: false }));
  if (!Array.isArray(tests) || tests.length > 100 || tests.some((test) => !test || typeof test.input !== "string" || typeof test.expectedOutput !== "string" || test.input.length > 100_000 || test.expectedOutput.length > 100_000 || typeof test.hidden !== "boolean")) throw new Error("Provide up to 100 valid test cases, each with input, expectedOutput, and hidden.");
  if (item.isPublished && (!samples.length || !tests.length)) throw new Error("Published problems need at least one sample and one grading test.");
  const bundled = bundledProblems.find((problem) => problem.slug === slug);
  const bundledId = bundledProblems.find((problem) => problem.id === item.id);
  if (bundledId && bundledId.slug !== slug) throw new Error("A bundled problem must keep its original slug.");
  if (bundled && item.id && item.id !== bundled.id) throw new Error("A bundled problem must keep its original ID.");
  return {
    id: bundled?.id || (item.id as string) || "", slug, title: text("title", 200),
    division: item.division as AdminProblem["division"], difficulty: item.difficulty as AdminProblem["difficulty"],
    topic: text("topic", 100), year: number("year", 2026, 2000, 2200), acceptanceRate: number("acceptanceRate", 0, 0, 100),
    summary: text("summary", 2000), statement: text("statement"), inputSpec: text("inputSpec"), outputSpec: text("outputSpec"),
    constraints: strings("constraints"), hints: strings("hints"), samples,
    starterCode: starter as AdminProblem["starterCode"], timeLimitMs: number("timeLimitMs", 2000, 250, 15000),
    memoryLimitKb: number("memoryLimitKb", 128000, 16000, 512000),
    isPublished: item.isPublished === true, isBundled: Boolean(bundled), tests,
  };
}
