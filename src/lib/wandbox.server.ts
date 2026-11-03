import "server-only";

import { normalizeOutput } from "@/lib/utils";
import type { JudgeVerdict, Language, TestResult } from "@/lib/types";
import type { StoredTestCase } from "@/lib/test-cases.server";

const COMPILERS: Record<Language, string> = {
  python: process.env.WANDBOX_PYTHON_COMPILER ?? "cpython-3.11.10",
  cpp: process.env.WANDBOX_CPP_COMPILER ?? "gcc-13.2.0",
  java: process.env.WANDBOX_JAVA_COMPILER ?? "openjdk-jdk-21+35",
};

type WandboxResponse = {
  status?: string;
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  compiler_message?: string;
  program_output?: string;
  program_error?: string;
  program_message?: string;
};

function detail(value: string | undefined) {
  return value?.trim() ? value : null;
}

export async function executeWithWandbox(
  sourceCode: string,
  language: Language,
  test: StoredTestCase,
  index: number,
  timeLimitMs: number,
  compareOutput: boolean,
  requestBudgetMs = 45_000,
): Promise<TestResult> {
  const baseUrl = (process.env.WANDBOX_URL ?? "https://wandbox.org/api").replace(/\/$/, "");
  // This includes the provider's queue and compiler startup, not just program CPU.
  const timeoutMs = Math.max(1, Math.min(45_000, requestBudgetMs));

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/compile.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: COMPILERS[language],
        // Wandbox compiles prog.java and discovers its main class after compilation.
        // Keep Main and its references intact, but remove the filename-dependent modifier.
        code: language === "java" ? sourceCode.replace(/^(\s*)public(?=\s+class\s+Main\b)/m, "$1      ") : sourceCode,
        stdin: test.input,
        options: language === "cpp" ? "warning,gnu++17" : "",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") throw new Error("The execution service timed out while compiling or running. Please try again.");
    throw error;
  }

  if (!response.ok) {
    const responseDetail = await response.text();
    throw new Error(`Wandbox rejected the submission (${response.status}): ${responseDetail.slice(0, 240)}`);
  }

  const result = (await response.json()) as WandboxResponse;
  const stdout = result.program_output ?? null;
  const compileOutput = detail(result.compiler_error) ?? detail(result.compiler_message) ?? detail(result.compiler_output);
  const stderr =
    detail(result.program_error) ??
    (result.status === "0" ? null : detail(result.program_message) ?? detail(result.signal));

  let executionVerdict: JudgeVerdict | null = null;
  if (result.status !== "0") {
    executionVerdict = compileOutput ? "Compilation Error" : "Runtime Error";
  }

  const verdict: JudgeVerdict =
    executionVerdict ??
    (!compareOutput || normalizeOutput(stdout ?? "") === normalizeOutput(test.expectedOutput)
      ? "Accepted"
      : "Wrong Answer");

  return {
    index,
    verdict,
    stdout,
    expectedOutput: test.hidden || !compareOutput ? undefined : test.expectedOutput,
    stderr,
    compileOutput,
    time: null,
    memory: null,
    hidden: test.hidden,
  };
}
