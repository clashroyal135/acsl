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
): Promise<TestResult> {
  const baseUrl = (process.env.WANDBOX_URL ?? "https://wandbox.org/api").replace(/\/$/, "");
  const timeoutMs = Math.min(15_000, Math.max(10_000, timeLimitMs + 5_000));

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/compile.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: COMPILERS[language],
        code: sourceCode,
        stdin: test.input,
        options: language === "cpp" ? "warning,gnu++17" : "",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return {
        index,
        verdict: "Time Limit Exceeded",
        stdout: null,
        expectedOutput: test.hidden || !compareOutput ? undefined : test.expectedOutput,
        stderr: "The execution service did not finish before the time limit.",
        compileOutput: null,
        time: null,
        memory: null,
        hidden: test.hidden,
      };
    }
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
