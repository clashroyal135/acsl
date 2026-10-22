import { NextResponse } from "next/server";
import { getAllProblems } from "@/lib/database.server";

export async function GET() {
  const problems = await getAllProblems();
  return NextResponse.json(
    problems.map(({ starterCode: _starterCode, hints: _hints, ...problem }) => problem),
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
