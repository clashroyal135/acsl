import { NextRequest, NextResponse } from "next/server";
import { errorResponse, isAllowedOrigin, isLanguage, requestKey, validateCode } from "@/lib/api.server";
import { getProblemBySlug } from "@/lib/database.server";
import { gradeSubmission } from "@/lib/judge0.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { describeTestCases, getGradingTests } from "@/lib/grading-tests.server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const limit = checkRateLimit(`run:${requestKey(request)}`, 20, 60_000);
  if (!limit.allowed) return errorResponse("Run limit reached. Try again shortly.", 429, { "Retry-After": String(limit.retryAfter) });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.");
  }

  if (typeof body.problemSlug !== "string" || !validateCode(body.code) || !isLanguage(body.language)) {
    return errorResponse("A valid problem, language, and source code are required.");
  }

  const problem = await getProblemBySlug(body.problemSlug);
  if (!problem) return errorResponse("Problem not found.", 404);

  const custom = body.mode === "custom";
  if (body.mode !== undefined && !["sample", "custom", "all"].includes(String(body.mode))) return errorResponse("Choose samples, custom input, or all tests.");
  const input = String(body.customInput ?? "");
  if (custom && input.length > 50_000) return errorResponse("Custom input is too large.");

  try {
    const tests = custom ? [{ input, expectedOutput: "", hidden: false }]
      : body.mode === "all" ? await getGradingTests(problem)
      : problem.samples.map((sample) => ({ input: sample.input, expectedOutput: sample.output, hidden: false }));
    if (!tests.length) return errorResponse("No test cases are configured for this problem.", 503);
    const result = await gradeSubmission({
      sourceCode: body.code,
      language: body.language,
      tests,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      compareOutput: !custom,
    });
    return NextResponse.json({ ...result, cases: describeTestCases(tests) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution service failed.";
    return errorResponse(message, 502);
  }
}
