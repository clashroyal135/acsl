import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin.server";
import { isUserId } from "@/lib/admin-students.server";
import { getAllProblems } from "@/lib/database.server";
import { isOwnAvatarPath, PROFILE_PICTURE_BUCKET } from "@/lib/profile";
import type { StudentProgress } from "@/lib/admin-types";

export async function getPublicProfile(id: string) {
  noStore();
  if (!isUserId(id)) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: profile, error } = await admin.from("profiles").select("id,display_name,full_name,show_name,about_me,avatar_path").eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load this profile.");
  if (!profile) return null;

  const [viewerAdmin, problems, progressResult] = await Promise.all([
    requireAdmin(), getAllProblems(), admin.rpc("admin_student_progress", { p_user_ids: [id] }),
  ]);
  if (progressResult.error) throw new Error("Unable to load profile progress.");
  const progress = ((progressResult.data ?? []) as StudentProgress[])[0];
  const solved = new Set(progress?.solved_problem_ids ?? []);
  const attempted = new Set(progress?.attempted_problem_ids ?? []);
  let avatarUrl: string | null = null;
  if (isOwnAvatarPath(profile.avatar_path, id)) {
    const { data } = await admin.storage.from(PROFILE_PICTURE_BUCKET).createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }
  const visibleName = profile.show_name === true || Boolean(viewerAdmin);

  // Return an explicit public projection. A hidden name never reaches page props for other users.
  return {
    id: profile.id as string,
    displayName: (profile.display_name as string) || "Coder",
    fullName: visibleName ? (profile.full_name as string) || null : null,
    nameIsPrivate: Boolean(viewerAdmin && !profile.show_name && profile.full_name),
    aboutMe: (profile.about_me as string) || "",
    avatarUrl,
    submissionCount: Number(progress?.submission_count ?? 0),
    solvedCount: problems.filter((problem) => solved.has(problem.id)).length,
    attemptedCount: problems.filter((problem) => attempted.has(problem.id)).length,
    problems: problems.map((problem) => ({
      id: problem.id, slug: problem.slug, title: problem.title, division: problem.division,
      status: solved.has(problem.id) ? "Solved" : attempted.has(problem.id) ? "Attempted" : "Not started",
    })),
  };
}
