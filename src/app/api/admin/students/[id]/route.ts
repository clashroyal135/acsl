import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.server";
import { adminPageNumber, isUserId, studentSummaries } from "@/lib/admin-students.server";
import { getAdminProblems } from "@/lib/admin-problems.server";
import { errorResponse } from "@/lib/api.server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const { id } = await params;
  if (!isUserId(id)) return errorResponse("Invalid user ID.");
  const { data: auth, error: userError } = await admin.auth.admin.getUserById(id);
  if (userError || !auth.user) return errorResponse("Account not found.", 404);
  const page = adminPageNumber(request.nextUrl.searchParams.get("page"));
  const pageSize = 20;
  try {
    const [students, problems, submissions] = await Promise.all([
      studentSummaries(admin, [auth.user]), getAdminProblems(admin),
      admin.from("submissions").select("id, problem_id, language, verdict, passed_tests, total_tests, execution_time_ms, memory_kb, created_at", { count: "exact" }).eq("user_id", id).order("created_at", { ascending: false }).order("id").range((page - 1) * pageSize, page * pageSize - 1),
    ]);
    if (submissions.error) return errorResponse(submissions.error.message, 500);
    return NextResponse.json({ student: students[0], submissions: submissions.data, total: submissions.count, page, pageSize,
      problems: problems.map(({ id, title, division, isPublished }) => ({ id, title, division, isPublished })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to load student.", 500);
  }
}
