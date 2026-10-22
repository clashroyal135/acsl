import { NextRequest, NextResponse } from "next/server";
import { errorResponse, isAllowedOrigin, isLanguage, requestKey, validateCode } from "@/lib/api.server";
import { getProblemBySlug } from "@/lib/database.server";
import { gradeSubmission } from "@/lib/judge0.server";
import { checkRateLimit } from "@/lib/rate-limit.server";

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
  const sampleIndex = typeof body.sampleIndex === "number" ? body.sampleIndex : 0;
  const sample = problem.samples[sampleIndex] ?? problem.samples[0];
  if (!custom && !sample) return errorResponse("This problem has no public sample.");
  const input = custom ? String(body.customInput ?? "") : sample.input;
  if (input.length > 50_000) return errorResponse("Custom input is too large.");

  try {
    const result = await gradeSubmission({
      sourceCode: body.code,
      language: body.language,
      tests: [{ input, expectedOutput: custom ? "" : sample.output, hidden: false }],
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
      compareOutput: !custom,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution service failed.";
    return errorResponse(message, 502);
  }
}
