import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestSiteOrigin } from "@/lib/site-url";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  return NextResponse.redirect(new URL("/", requestSiteOrigin(request.url, request.headers.get("host"))), 303);
}
