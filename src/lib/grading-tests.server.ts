import "server-only";
import { getDatabaseTests } from "@/lib/database.server";
import { getBundledTests, type StoredTestCase } from "@/lib/test-cases.server";
import type { Problem, TestCaseDetails } from "@/lib/types";

export async function getGradingTests(problem: Problem): Promise<StoredTestCase[]> {
  const stored = await getDatabaseTests(problem.id);
  if (stored.length) return stored;
  const sample = problem.samples[0];
  return sample ? getBundledTests(problem.slug, sample.input, sample.output) : [];
}

export function describeTestCases(tests: StoredTestCase[]): TestCaseDetails[] {
  return tests.map((test, index) => test.hidden
    ? { index, hidden: true }
    : { index, hidden: false, input: test.input, expectedOutput: test.expectedOutput });
}
