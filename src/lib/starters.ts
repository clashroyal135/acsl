import type { StarterCode } from "@/lib/types";

const EDITABLE_START = "ACSL_EDITABLE_START";
const EDITABLE_END = "ACSL_EDITABLE_END";

export type StarterSections = {
  prefix: string;
  editable: string;
  suffix: string;
};

export function splitStarterCode(source: string): StarterSections {
  const startToken = source.indexOf(EDITABLE_START);
  const endToken = source.indexOf(EDITABLE_END);
  if (startToken < 0 || endToken < startToken) return { prefix: "", editable: source, suffix: "" };

  const startLineEnd = source.indexOf("\n", startToken);
  const startLineStart = source.lastIndexOf("\n", startToken) + 1;
  const endLineStart = source.lastIndexOf("\n", endToken);
  const endLineEnd = source.indexOf("\n", endToken);
  if (startLineEnd < 0 || endLineStart < startLineEnd) return { prefix: "", editable: source, suffix: "" };

  return {
    prefix: source.slice(0, startLineStart),
    editable: source.slice(startLineEnd + 1, endLineStart + 1),
    suffix: endLineEnd < 0 ? "" : source.slice(endLineEnd + 1),
  };
}

export const defaultStarter: StarterCode = {
  python: `import sys

def solve(data: str) -> str:
    # ACSL_EDITABLE_START
    lines = data.strip().splitlines()
    # Write your solution here.
    return ""
    # ACSL_EDITABLE_END

if __name__ == "__main__":
    sys.stdout.write(solve(sys.stdin.read()))
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

string solve(const string& input) {
    // ACSL_EDITABLE_START
    istringstream in(input);
    ostringstream out;
    // Write your solution here.
    return out.str();
    // ACSL_EDITABLE_END
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
    cout << solve(input);
    return 0;
}
`,
  java: `import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class Main {
    static String solve(String input) {
        // ACSL_EDITABLE_START
        Scanner scanner = new Scanner(input);
        StringBuilder output = new StringBuilder();
        // Write your solution here.
        return output.toString();
        // ACSL_EDITABLE_END
    }

    public static void main(String[] args) throws Exception {
        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
        System.out.print(solve(input));
    }
}
`,
};
