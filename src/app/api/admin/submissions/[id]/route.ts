import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.server";
import { isUserId } from "@/lib/admin-students.server";
import { errorResponse } from "@/lib/api.server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const { id } = await params;
  if (!isUserId(id)) return errorResponse("Invalid submission ID.");
  const { data, error } = await admin.from("submissions").select("id, user_id, problem_id, language, source_code, verdict, passed_tests, total_tests, execution_time_ms, memory_kb, created_at").eq("id", id).maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Submission not found.", 404);
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
