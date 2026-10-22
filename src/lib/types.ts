export type Division = "Junior" | "Intermediate" | "Senior";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Language = "python" | "cpp" | "java";

export type StarterCode = Record<Language, string>;

export type SampleCase = {
  input: string;
  output: string;
  explanation?: string;
};

export type Problem = {
  id: string;
  slug: string;
  title: string;
  division: Division;
  difficulty: Difficulty;
  topic: string;
  year: number;
  acceptanceRate: number;
  summary: string;
  statement: string;
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  samples: SampleCase[];
  hints: string[];
  starterCode: StarterCode;
  timeLimitMs: number;
  memoryLimitKb: number;
};

export type JudgeVerdict =
  | "Accepted"
  | "Wrong Answer"
  | "Compilation Error"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Internal Error";

export type TestResult = {
  index: number;
  verdict: JudgeVerdict;
  stdout: string | null;
  expectedOutput?: string;
  stderr: string | null;
  compileOutput: string | null;
  time: number | null;
  memory: number | null;
  hidden: boolean;
};

export type SubmissionResult = {
  verdict: JudgeVerdict;
  passed: number;
  total: number;
  time: number | null;
  memory: number | null;
  tests: TestResult[];
};
