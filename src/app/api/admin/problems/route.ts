import { NextRequest, NextResponse } from "next/server";
import { errorResponse, isAllowedOrigin } from "@/lib/api.server";
import { requireAdmin } from "@/lib/admin.server";
import { getAdminProblems, problemToRow, validateAdminProblem } from "@/lib/admin-problems.server";
import { problems as bundledProblems } from "@/lib/problems";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  try {
    return NextResponse.json(await getAdminProblems(admin), { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to load problems.", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const payload = await request.json().catch(() => null);
  const items = Array.isArray(payload) ? payload : [payload];
  if (!items.length || items.length > 100) return errorResponse("Provide one problem or an array of up to 100 problems.");
  try {
    const problems = items.map(validateAdminProblem);
    const results = [];
    for (const problem of problems) {
      const { data, error } = await admin.rpc("admin_save_problem", { p_problem: problemToRow(problem), p_tests: problem.tests });
      if (error) return errorResponse(`${problem.title}: ${error.message}${results.length ? ` (${results.length} earlier problems were saved.)` : ""}`);
      results.push(data);
    }
    return NextResponse.json(results, { status: 201, headers: privateHeaders });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid problem data.");
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || typeof body.isPublished !== "boolean") return errorResponse("Problem ID and publication status are required.");
  try {
    const problem = (await getAdminProblems(admin)).find((problem) => problem.id === body.id);
    if (!problem) return errorResponse("Problem not found.", 404);
    if (body.isPublished && (!problem.samples.length || !problem.tests.length)) return errorResponse("Add a sample and a grading test before publishing.");
    const { data: stored, error: lookupError } = await admin.from("problems").select("id").eq("id", problem.id).maybeSingle();
    if (lookupError) return errorResponse(lookupError.message, 500);
    if (stored) {
      const { error } = await admin.from("problems").update({ is_published: body.isPublished, updated_at: new Date().toISOString() }).eq("id", problem.id);
      if (error) return errorResponse(error.message);
    } else {
      const { error } = await admin.rpc("admin_save_problem", { p_problem: problemToRow({ ...problem, isPublished: body.isPublished }), p_tests: problem.tests });
      if (error) return errorResponse(error.message);
    }
    return NextResponse.json({ id: problem.id, isPublished: body.isPublished }, { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to update publication status.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("Problem ID is required.");
  if (bundledProblems.some((problem) => problem.id === id)) return errorResponse("Use Unpublish to hide a bundled problem.");
  const { error } = await admin.from("problems").delete().eq("id", id);
  if (error) return errorResponse(error.message);
  return new NextResponse(null, { status: 204 });
}
