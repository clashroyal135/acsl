import type { Problem } from "@/lib/types";

export type AdminTestCase = { input: string; expectedOutput: string; hidden: boolean };
export type AdminProblem = Problem & { isPublished: boolean; isBundled: boolean; tests: AdminTestCase[] };
export type StudentProgress = {
  user_id: string;
  submission_count: number;
  solved_problem_ids: string[];
  attempted_problem_ids: string[];
  last_submission_at: string | null;
};
export type AdminStudent = {
  id: string;
  email: string;
  displayName: string;
  fullName: string;
  showName: boolean;
  aboutMe: string;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
  lastSignInAt: string | null;
  progress: StudentProgress;
};
export type AdminSubmission = {
  id: string;
  problem_id: string;
  language: string;
  verdict: string;
  passed_tests: number;
  total_tests: number;
  execution_time_ms: number | null;
  memory_kb: number | null;
  created_at: string;
};
export type StudentDetail = {
  student: AdminStudent;
  submissions: AdminSubmission[];
  total: number;
  page: number;
  pageSize: number;
  problems: { id: string; title: string; division: string; year: number; isPublished: boolean }[];
};
