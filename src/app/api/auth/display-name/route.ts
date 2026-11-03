import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requestKey } from "@/lib/api.server";
import { checkRateLimit } from "@/lib/rate-limit.server";
import { validateDisplayName } from "@/lib/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(`display-name:${requestKey(request)}`, 60, 60_000);
  if (!limit.allowed) return errorResponse("Too many checks. Please try again shortly.", 429, { "Retry-After": String(limit.retryAfter) });
  let name: string;
  try { name = validateDisplayName(request.nextUrl.searchParams.get("name")); }
  catch (error) { return errorResponse(error instanceof Error ? error.message : "Enter a display name."); }
  const admin = createSupabaseAdminClient();
  if (!admin) return errorResponse("Unable to check display names right now. Please try again.", 503);
  const { data, error } = await admin.rpc("admin_display_name_available", { p_display_name: name });
  if (error) return errorResponse("Unable to check display names right now. Please try again.", 503);
  return NextResponse.json({ available: data === true }, { headers: { "Cache-Control": "no-store" } });
}
