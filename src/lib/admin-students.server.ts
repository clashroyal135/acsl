import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AdminStudent, StudentProgress } from "@/lib/admin-types";
import type { requireAdmin } from "@/lib/admin.server";
import { getAllProblems } from "@/lib/database.server";
import { questionProgress } from "@/lib/problem-groups";

export async function studentSummaries(admin: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>, users: User[]): Promise<AdminStudent[]> {
  if (!users.length) return [];
  const ids = users.map((user) => user.id);
  const [profiles, progress, problems] = await Promise.all([
    admin.from("profiles").select("id, display_name, full_name, show_name, about_me, role").in("id", ids),
    admin.rpc("admin_student_progress", { p_user_ids: ids }),
    getAllProblems(),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  if (progress.error) throw new Error(progress.error.message);
  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const progressMap = new Map(((progress.data ?? []) as StudentProgress[]).map((item) => [item.user_id, item]));
  return users.map((user) => {
    const rawProgress = progressMap.get(user.id);
    const questions = questionProgress(problems, rawProgress?.solved_problem_ids ?? [], rawProgress?.attempted_problem_ids ?? []);
    return {
    id: user.id, email: user.email ?? "", displayName: profileMap.get(user.id)?.display_name ?? "Coder",
    fullName: profileMap.get(user.id)?.full_name ?? "", showName: profileMap.get(user.id)?.show_name === true,
    aboutMe: profileMap.get(user.id)?.about_me ?? "",
    role: profileMap.get(user.id)?.role ?? "student", createdAt: user.created_at, lastSignInAt: user.last_sign_in_at ?? null,
    progress: progressMap.get(user.id) ?? { user_id: user.id, submission_count: 0, solved_problem_ids: [], attempted_problem_ids: [], last_submission_at: null },
    questionsSolved: questions.filter(question => question.solved).length,
    questionsAttempted: questions.filter(question => question.attempted).length,
    };
  });
}

export function adminPageNumber(value: string | null) {
  const page = Number(value ?? 1);
  return Number.isSafeInteger(page) && page > 0 && page <= 1_000_000 ? page : 1;
}

export function isUserId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
