import { NextRequest, NextResponse } from "next/server";
import { errorResponse, isAllowedOrigin } from "@/lib/api.server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!data.user) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return profile?.role === "admin" ? admin : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const { data, error } = await admin.from("problems").select("*, test_cases(*)").order("created_at", { ascending: false });
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);

  const payload = await request.json().catch(() => null);
  const items = Array.isArray(payload) ? payload : [payload];
  if (!items.length || items.length > 100 || items.some((item) => !item?.slug || !item?.title)) {
    return errorResponse("Provide one problem object or an array of up to 100 valid problems.");
  }

  const results = [];
  for (const item of items) {
    const { tests = [], id, acceptanceRate, inputSpec, outputSpec, starterCode, timeLimitMs, memoryLimitKb, isPublished, ...rest } = item;
    const problem = {
      ...rest,
      ...(id ? { id } : {}),
      acceptance_rate: acceptanceRate ?? 0,
      input_spec: inputSpec,
      output_spec: outputSpec,
      starter_code: starterCode,
      time_limit_ms: timeLimitMs ?? 2000,
      memory_limit_kb: memoryLimitKb ?? 128000,
      is_published: isPublished ?? false,
    };
    const { data, error } = await admin.from("problems").upsert(problem, { onConflict: "slug" }).select().single();
    if (error) return errorResponse(error.message, 400);
    if (Array.isArray(tests)) {
      await admin.from("test_cases").delete().eq("problem_id", data.id);
      if (tests.length) {
        const { error: testError } = await admin.from("test_cases").insert(
          tests.map((test: Record<string, unknown>, position: number) => ({
            problem_id: data.id,
            input: test.input,
            expected_output: test.expectedOutput,
            is_hidden: test.hidden ?? true,
            position,
          })),
        );
        if (testError) return errorResponse(testError.message, 400);
      }
    }
    results.push(data);
  }
  return NextResponse.json(results, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!isAllowedOrigin(request)) return errorResponse("Origin is not allowed.", 403);
  const admin = await requireAdmin();
  if (!admin) return errorResponse("Administrator access required.", 403);
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return errorResponse("Problem id is required.");
  const { error } = await admin.from("problems").delete().eq("id", id);
  if (error) return errorResponse(error.message, 400);
  return new NextResponse(null, { status: 204 });
}
