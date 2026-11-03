import "server-only";

import { normalizeOutput } from "@/lib/utils";
import type { JudgeVerdict, Language, SubmissionResult, TestResult } from "@/lib/types";
import type { StoredTestCase } from "@/lib/test-cases.server";
import { executeWithWandbox } from "@/lib/wandbox.server";
import { buildWandboxBatch, readWandboxBatch } from "@/lib/wandbox-batch.server";

const LANGUAGE_IDS: Record<Language, number> = {
  python: Number(process.env.JUDGE0_PYTHON_LANGUAGE_ID ?? 71),
  cpp: Number(process.env.JUDGE0_CPP_LANGUAGE_ID ?? 54),
  java: Number(process.env.JUDGE0_JAVA_LANGUAGE_ID ?? 62),
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function decode(value: string | null | undefined) {
  if (!value) return null;
  return Buffer.from(value, "base64").toString("utf8");
}

function headers() {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.JUDGE0_API_KEY;
  if (key) result[process.env.JUDGE0_API_KEY_HEADER ?? "X-Auth-Token"] = key;
  return result;
}

function mapStatus(id: number): JudgeVerdict {
  if (id === 5) return "Time Limit Exceeded";
  if (id === 6) return "Compilation Error";
  if (id >= 7 && id <= 12) return "Runtime Error";
  if (id === 13 || id === 14) return "Internal Error";
  return "Runtime Error";
}

type Judge0Response = {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
  status?: { id: number; description: string };
};

async function executeOne(
  sourceCode: string,
  language: Language,
  test: StoredTestCase,
  index: number,
  timeLimitMs: number,
  memoryLimitKb: number,
  compareOutput: boolean,
  deadline: number,
): Promise<TestResult> {
  const baseUrl = process.env.JUDGE0_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return executeWithWandbox(sourceCode, language, test, index, timeLimitMs, compareOutput, deadline - Date.now());
  }

  const createResponse = await fetch(`${baseUrl}/submissions?base64_encoded=true&wait=false`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      source_code: encode(sourceCode),
      language_id: LANGUAGE_IDS[language],
      stdin: encode(test.input),
      cpu_time_limit: Math.max(1, Math.ceil(timeLimitMs / 1000)),
      wall_time_limit: Math.max(2, Math.ceil(timeLimitMs / 1000) + 1),
      memory_limit: memoryLimitKb,
      enable_network: false,
    }),
    cache: "no-store",
  });

  if (!createResponse.ok) {
    const detail = await createResponse.text();
    throw new Error(`Judge0 rejected the submission (${createResponse.status}): ${detail.slice(0, 240)}`);
  }

  let result = (await createResponse.json()) as Judge0Response;
  if (!result.token) throw new Error("Judge0 did not return a submission token.");

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt < 4 ? 250 : 500));
    const response = await fetch(
      `${baseUrl}/submissions/${result.token}?base64_encoded=true&fields=stdout,stderr,compile_output,message,time,memory,status`,
      { headers: headers(), cache: "no-store" },
    );
    if (!response.ok) throw new Error(`Judge0 status request failed (${response.status}).`);
    result = (await response.json()) as Judge0Response;
    if (result.status && result.status.id > 2) break;
  }

  if (!result.status || result.status.id <= 2) throw new Error("Judge0 did not finish before the grading timeout.");

  const stdout = decode(result.stdout);
  const stderr = decode(result.stderr) ?? decode(result.message);
  const compileOutput = decode(result.compile_output);
  const executionVerdict = result.status.id === 3 ? null : mapStatus(result.status.id);
  const verdict: JudgeVerdict = executionVerdict ??
    (!compareOutput || normalizeOutput(stdout ?? "") === normalizeOutput(test.expectedOutput) ? "Accepted" : "Wrong Answer");

  return {
    index,
    verdict,
    stdout,
    expectedOutput: test.hidden || !compareOutput ? undefined : test.expectedOutput,
    stderr,
    compileOutput,
    time: result.time ? Number(result.time) : null,
    memory: result.memory ?? null,
    hidden: test.hidden,
  };
}

export async function gradeSubmission(options: {
  sourceCode: string;
  language: Language;
  tests: StoredTestCase[];
  timeLimitMs: number;
  memoryLimitKb: number;
  compareOutput?: boolean;
}): Promise<SubmissionResult> {
  const batch = !process.env.JUDGE0_URL ? buildWandboxBatch(options.sourceCode, options.language, options.tests) : null;
  if (batch) {
    const execution = await executeWithWandbox(batch.sourceCode, options.language,
      { input: batch.input, expectedOutput: "", hidden: true }, 0, options.timeLimitMs, false, 50_000);
    return readWandboxBatch(batch, execution, options.tests);
  }
  const completed: (TestResult | undefined)[] = new Array(options.tests.length);
  const deadline = Date.now() + 50_000;
  let nextIndex = 0;
  let stopped = false;
  async function worker() {
    while (!stopped && nextIndex < options.tests.length) {
      if (Date.now() >= deadline) throw new Error("The execution service could not finish grading in time. Please try again.");
      const index = nextIndex++;
      const result = await executeOne(
        options.sourceCode,
        options.language,
        options.tests[index],
        index,
        options.timeLimitMs,
        options.memoryLimitKb,
        options.compareOutput ?? true,
        deadline,
      );
      // Submitted programs can print stdin or include it in runtime errors.
      // Keep every hidden execution detail on the server, including those outputs.
      completed[index] = options.tests[index].hidden
        ? { ...result, stdout: null, expectedOutput: undefined, stderr: null, compileOutput: null }
        : result;
      if (["Compilation Error", "Runtime Error", "Time Limit Exceeded", "Internal Error"].includes(result.verdict)) stopped = true;
    }
  }
  // Bound remote execution concurrency so a 12-case suite does not compile serially.
  await Promise.all(Array.from({ length: Math.min(3, options.tests.length) }, () => worker()));
  const results = completed.filter((result): result is TestResult => result !== undefined);

  const failed = results.find((test) => test.verdict !== "Accepted");
  return {
    verdict: failed?.verdict ?? "Accepted",
    passed: results.filter((test) => test.verdict === "Accepted").length,
    total: options.tests.length,
    time: results.reduce<number | null>((max, test) => (test.time == null ? max : Math.max(max ?? 0, test.time)), null),
    memory: results.reduce<number | null>((max, test) => (test.memory == null ? max : Math.max(max ?? 0, test.memory)), null),
    tests: results,
  };
}
