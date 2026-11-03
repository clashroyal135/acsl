import "server-only";
import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";

import { problems as bundledProblems, getProblem as getBundledProblem } from "@/lib/problems";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Problem } from "@/lib/types";
import type { StoredTestCase } from "@/lib/test-cases.server";

type ProblemRow = Omit<Problem, "starterCode" | "samples" | "constraints" | "hints"> & {
  starter_code: Problem["starterCode"];
  samples: Problem["samples"];
  constraints: string[];
  hints: string[];
};

export function fromRow(row: Record<string, unknown>): Problem {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    division: row.division as Problem["division"],
    difficulty: row.difficulty as Problem["difficulty"],
    topic: String(row.topic),
    year: Number(row.year),
    acceptanceRate: Number(row.acceptance_rate ?? 0),
    summary: String(row.summary),
    statement: String(row.statement),
    inputSpec: String(row.input_spec),
    outputSpec: String(row.output_spec),
    constraints: (row.constraints as string[]) ?? [],
    samples: (row.samples as Problem["samples"]) ?? [],
    hints: (row.hints as string[]) ?? [],
    starterCode: row.starter_code as Problem["starterCode"],
    timeLimitMs: Number(row.time_limit_ms ?? 2000),
    memoryLimitKb: Number(row.memory_limit_kb ?? 128000),
  };
}

// Share reads within one server render, including metadata. Nothing persists across requests.
export const getAllProblems = cache(async (): Promise<Problem[]> => {
  noStore();
  const admin = createSupabaseAdminClient();
  if (!admin) return bundledProblems;

  const { data, error } = await admin.from("problems").select("*").order("created_at");
  if (error) throw new Error("Unable to load problem availability.");

  const storedSlugs = new Set((data ?? []).map((row) => row.slug));
  return [...bundledProblems.filter((problem) => !storedSlugs.has(problem.slug)), ...(data ?? []).filter((row) => row.is_published).map((row) => fromRow(row))];
});

export const getProblemBySlug = cache(async (slug: string): Promise<Problem | undefined> => {
  noStore();
  const admin = createSupabaseAdminClient();
  if (!admin) return getBundledProblem(slug);
  const { data, error } = await admin.from("problems").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Unable to load problem availability.");
  if (data) return data.is_published ? fromRow(data) : undefined;
  return getBundledProblem(slug);
});

export async function getDatabaseTests(problemId: string): Promise<StoredTestCase[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("test_cases")
    .select("input, expected_output, is_hidden")
    .eq("problem_id", problemId)
    .order("position");
  if (error) throw new Error("Unable to load grading cases.");
  return (data ?? []).map((row) => ({
    input: row.input,
    expectedOutput: row.expected_output,
    hidden: row.is_hidden,
  }));
}

export type { ProblemRow };
