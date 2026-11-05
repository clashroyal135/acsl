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
  statementLayout?: StatementBlock[];
  inputSpec: string;
  outputSpec: string;
  constraints: string[];
  samples: SampleCase[];
  hints: string[];
  starterCode: StarterCode;
  timeLimitMs: number;
  memoryLimitKb: number;
};

export type StatementBlock =
  | { type: "prose"; markdown: string }
  | { type: "table"; caption: string; columns: string[]; rows: string[][]; widths?: number[] }
  | { type: "math"; tex: string; label?: string; html: string }
  | { type: "figure"; src: string; alt: string; width: number; height: number; displayWidth: number }
  | { type: "grid" | "triangle"; caption: string; rows: string[][] }
  | { type: "tiles"; rows: string[][]; discard: string[] }
  | { type: "clock"; colors: string; time: string }
  | { type: "example"; input: string; output: string };

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

export type TestCaseDetails = { index: number; hidden: boolean; input?: string; expectedOutput?: string };
export type ExecutionResult = Omit<SubmissionResult, "verdict"> & { verdict: JudgeVerdict | "In progress"; cases: TestCaseDetails[]; saved?: boolean };
