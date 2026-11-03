import { NextRequest, NextResponse } from "next/server";
import { errorResponse, isAllowedOrigin, isLanguage, requestKey, validateCode } from "@/lib/api.server";
import { getProblemBySlug } from "@/lib/database.server";
import { gradeSubmission } from "@/lib/judge0.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { describeTestCases, getGradingTests } from "@/lib/grading-tests.server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const limit = checkRateLimit(`submit:${requestKey(request)}`, 8, 60_000);
  if (!limit.allowed) return errorResponse("Submission limit reached. Try again shortly.", 429, { "Retry-After": String(limit.retryAfter) });

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
  try {
    const tests = await getGradingTests(problem);
    if (!tests.length) return errorResponse("No grading cases are configured for this problem.", 503);
    const result = await gradeSubmission({
      sourceCode: body.code,
      language: body.language,
      tests,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitKb: problem.memoryLimitKb,
    });

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data: authData } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (admin && authData.user) {
      const { error: saveError } = await admin.from("submissions").insert({
        user_id: authData.user.id,
        problem_id: problem.id,
        language: body.language,
        source_code: body.code,
        verdict: result.verdict,
        passed_tests: result.passed,
        total_tests: result.total,
        execution_time_ms: result.time == null ? null : Math.round(result.time * 1000),
        memory_kb: result.memory,
      });
      if (saveError) return errorResponse("Your code was graded, but the submission could not be saved. Please try again.", 500);
    }
    return NextResponse.json({ ...result, cases: describeTestCases(tests), saved: Boolean(admin && authData.user) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grading service failed.";
    return errorResponse(message, 502);
  }
}
