import type { StarterCode } from "@/lib/types";

export const defaultStarter: StarterCode = {
  python: `import sys

def solve(data: str) -> str:
    lines = data.strip().splitlines()
    # Write your solution here.
    return ""

if __name__ == "__main__":
    print(solve(sys.stdin.read()))
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Write your solution here.
    return 0;
}
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Write your solution here.
    }
}
`,
};
