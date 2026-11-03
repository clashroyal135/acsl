import "server-only";
import hiddenCases from "@/lib/contest1/hidden-tests.json";
import { getProblem } from "@/lib/problems";

export type StoredTestCase = { input: string; expectedOutput: string; hidden: boolean };
const hiddenTests: Record<string, StoredTestCase[]> = hiddenCases;

export function getBundledTests(slug: string, sampleInput: string, sampleOutput: string): StoredTestCase[] {
  const samples = getProblem(slug)?.samples ?? [{ input: sampleInput, output: sampleOutput }];
  return [
    ...samples.map((sample) => ({ input: sample.input, expectedOutput: sample.output, hidden: false })),
    ...(hiddenTests[slug] ?? []),
  ];
}
