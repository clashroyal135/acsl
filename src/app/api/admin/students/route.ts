import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.server";
import { adminPageNumber, studentSummaries } from "@/lib/admin-students.server";
import { errorResponse } from "@/lib/api.server";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const page = adminPageNumber(request.nextUrl.searchParams.get("page"));
  const pageSize = 25;
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
  if (error) return errorResponse(error.message, 500);
  try {
    return NextResponse.json({ students: await studentSummaries(admin, data.users), total: data.total, page, pageSize }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unable to load student progress.", 500);
  }
}
