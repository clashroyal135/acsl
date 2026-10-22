import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { Language } from "@/lib/types";

export function requestKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const ownOrigin = request.nextUrl.origin;
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return origin === ownOrigin || allowed.includes(origin);
}

export function errorResponse(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function isLanguage(value: unknown): value is Language {
  return value === "python" || value === "cpp" || value === "java";
}

export function validateCode(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100_000;
}
