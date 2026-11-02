import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AdminStudent, StudentProgress } from "@/lib/admin-types";
import type { requireAdmin } from "@/lib/admin.server";

export async function studentSummaries(admin: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>, users: User[]): Promise<AdminStudent[]> {
  if (!users.length) return [];
  const ids = users.map((user) => user.id);
  const [profiles, progress] = await Promise.all([
    admin.from("profiles").select("id, display_name, about_me, role").in("id", ids),
    admin.rpc("admin_student_progress", { p_user_ids: ids }),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  if (progress.error) throw new Error(progress.error.message);
  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const progressMap = new Map(((progress.data ?? []) as StudentProgress[]).map((item) => [item.user_id, item]));
  return users.map((user) => ({
    id: user.id, email: user.email ?? "", displayName: profileMap.get(user.id)?.display_name ?? "Coder",
    aboutMe: profileMap.get(user.id)?.about_me ?? "",
    role: profileMap.get(user.id)?.role ?? "student", createdAt: user.created_at, lastSignInAt: user.last_sign_in_at ?? null,
    progress: progressMap.get(user.id) ?? { user_id: user.id, submission_count: 0, solved_problem_ids: [], attempted_problem_ids: [], last_submission_at: null },
  }));
}

export function adminPageNumber(value: string | null) {
  const page = Number(value ?? 1);
  return Number.isSafeInteger(page) && page > 0 && page <= 1_000_000 ? page : 1;
}

export function isUserId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
