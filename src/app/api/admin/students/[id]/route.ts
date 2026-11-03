import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.server";
import { adminPageNumber, isUserId, studentSummaries } from "@/lib/admin-students.server";
import { getAdminProblems } from "@/lib/admin-problems.server";
import { errorResponse } from "@/lib/api.server";
import { isOwnAvatarPath, PROFILE_PICTURE_BUCKET } from "@/lib/profile";

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
    const [students, problems, submissions, profile] = await Promise.all([
      studentSummaries(admin, [auth.user]), getAdminProblems(admin),
      admin.from("submissions").select("id, problem_id, language, verdict, passed_tests, total_tests, execution_time_ms, memory_kb, created_at", { count: "exact" }).eq("user_id", id).order("created_at", { ascending: false }).order("id").range((page - 1) * pageSize, page * pageSize - 1),
      admin.from("profiles").select("avatar_path").eq("id", id).maybeSingle(),
    ]);
    if (submissions.error) return errorResponse(submissions.error.message, 500);
    if (profile.error) return errorResponse(profile.error.message, 500);
    let avatarUrl: string | null = null;
    if (isOwnAvatarPath(profile.data?.avatar_path, id)) {
      const { data } = await admin.storage.from(PROFILE_PICTURE_BUCKET).createSignedUrl(profile.data.avatar_path, 3600);
      avatarUrl = data?.signedUrl ?? null;
    }
    return NextResponse.json({ student: { ...students[0], avatarUrl }, submissions: submissions.data, total: submissions.count, page, pageSize,
      problems: problems.map(({ id, title, division, year, isPublished }) => ({ id, title, division, year, isPublished })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to load student.", 500);
  }
}
