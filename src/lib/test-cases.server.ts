import "server-only";

export type StoredTestCase = {
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

const hiddenTests: Record<string, StoredTestCase[]> = {
  "letter-relay": [
    { input: "4\nA 0\nXYZ 3\nHELLO 13\nLEAGUE 25\n", expectedOutput: "A\nABC\nURYYB\nKDZFTD\n", hidden: true },
    { input: "2\nAZBY 1\nCOMPUTER 7\n", expectedOutput: "BACZ\nJVTWBALY\n", hidden: true },
  ],
  "shared-signal": [
    { input: "4\n0 0 0 0\n2 8 4 6\n10 20 0 9\n7 12 1 100\n", expectedOutput: "1\n3\nNONE\n6\n", hidden: true },
    { input: "2\n0 1000000000 500 500\n42 42 43 43\n", expectedOutput: "1\nNONE\n", hidden: true },
  ],
  "run-recorder": [
    { input: "4\nA\nAABBAA\nMISSISSIPPI\nQQQQQRRRQS\n", expectedOutput: "A1\nA2B2A2\nM1I1S2I1S2I1P2I1\nQ5R3Q1S1\n", hidden: true },
    { input: "2\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nBBBBBBBBBB\n", expectedOutput: "A1B1C1D1E1F1G1H1I1J1K1L1M1N1O1P1Q1R1S1T1U1V1W1X1Y1Z1\nB10\n", hidden: true },
  ],
  "logic-stack": [
    { input: "5\n1!\n10^\n11&0|\n10|1&\n10&!1^\n", expectedOutput: "0\n1\n1\n1\n0\n", hidden: true },
    { input: "3\n11|!0^\n10&0&0&\n10|0|0|!\n", expectedOutput: "0\n0\n0\n", hidden: true },
  ],
  "beacon-distance": [
    { input: "3 3\n#..\n...\n..#\n5\n1 1\n1 3\n2 2\n3 1\n3 3\n", expectedOutput: "0\n2\n2\n2\n0\n", hidden: true },
    { input: "1 6\n...#..\n4\n1 1\n1 3\n1 4\n1 6\n", expectedOutput: "3\n1\n0\n2\n", hidden: true },
  ],
  "route-ledger": [
    { input: "4 4\n1 2 100\n1 3 2\n3 2 3\n2 4 4\n4\n1 2\n1 4\n3 4\n4 4\n", expectedOutput: "5\n9\n7\n0\n", hidden: true },
    { input: "6 3\n1 2 5\n2 3 6\n4 5 1\n4\n1 3\n1 6\n4 5\n3 2\n", expectedOutput: "11\nUNREACHABLE\n1\n6\n", hidden: true },
  ],
};

export function getBundledTests(slug: string, sampleInput: string, sampleOutput: string): StoredTestCase[] {
  return [
    { input: sampleInput, expectedOutput: sampleOutput, hidden: false },
    ...(hiddenTests[slug] ?? []),
  ];
}
