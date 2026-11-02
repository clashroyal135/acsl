import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const destination = new URL("/reset-password", request.url);
  const code = request.nextUrl.searchParams.get("code");

  try {
    const supabase = await createSupabaseServerClient();
    if (code && supabase && !request.nextUrl.searchParams.has("error")) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(destination);
    }
  } catch {
    // Failed exchanges must never open the password form for an existing session.
  }

  destination.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(destination);
}
