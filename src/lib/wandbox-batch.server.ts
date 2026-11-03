import "server-only";
import { randomBytes } from "node:crypto";
import { defaultStarter, splitStarterCode } from "@/lib/starters";
import { normalizeOutput } from "@/lib/utils";
import type { Language, SubmissionResult, TestResult } from "@/lib/types";
import type { StoredTestCase } from "@/lib/test-cases.server";

export type WandboxBatch = { sourceCode: string; input: string; marker: string };

// The UI locks this scaffold and exposes solve(input). Compiling one function
// suite avoids exhausting the fallback provider's ten-compilations/minute limit.
export function buildWandboxBatch(sourceCode: string, language: Language, tests: StoredTestCase[]): WandboxBatch | null {
  const { prefix, suffix } = splitStarterCode(defaultStarter[language]);
  if (!sourceCode.startsWith(prefix) || !sourceCode.endsWith(suffix) || tests.length < 2) return null;
  const marker = `ACSL_${randomBytes(16).toString("hex")}`;
  const functionSource = sourceCode.slice(0, sourceCode.length - suffix.length);
  const input = `${tests.length}\n${tests.map((test) => Buffer.from(test.input, "utf8").toString("base64")).join("\n")}\n`;
  let driver: string;
  if (language === "python") {
    driver = `

if __name__ == "__main__":
    import base64 as _b64, contextlib as _ctx, io as _io
    _count = int(sys.stdin.readline())
    _inputs = [_b64.b64decode(sys.stdin.readline()).decode("utf-8") for _ in range(_count)]
    _dest = sys.stdout
    _dest.write("${marker}\\n")
    for _index, _data in enumerate(_inputs):
        _stdout, _stderr, _status = _io.StringIO(), _io.StringIO(), "O"
        try:
            with _ctx.redirect_stdout(_stdout), _ctx.redirect_stderr(_stderr):
                _value = solve(_data)
                if not isinstance(_value, str):
                    raise TypeError("solve must return a string")
            _value = _stdout.getvalue() + _value
        except BaseException:
            _status, _value = "E", ""
        _encoded = _b64.b64encode(_value.encode("utf-8")).decode("ascii") or "-"
        _dest.write(str(_index) + " " + _status + " " + _encoded + "\\n")
    _dest.write("END_${marker}\\n")
`;
  } else if (language === "cpp") {
    driver = `}

static string acslBatchEncode(const string& value) {
    const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    string result; unsigned int buffer = 0; int bits = -6;
    for (unsigned char c : value) { buffer = (buffer << 8) | c; bits += 8; while (bits >= 0) { result += alphabet[(buffer >> bits) & 63]; bits -= 6; } }
    if (bits > -6) result += alphabet[((buffer << 8) >> (bits + 8)) & 63];
    while (result.size() % 4) result += '=';
    return result.empty() ? "-" : result;
}
static string acslBatchDecode(const string& value) {
    const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    string result; unsigned int buffer = 0; int bits = -8;
    for (char c : value) { size_t digit = alphabet.find(c); if (digit == string::npos) break; buffer = (buffer << 6) | (unsigned int)digit; bits += 6; if (bits >= 0) { result += char((buffer >> bits) & 255); bits -= 8; } }
    return result;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string line; getline(cin, line); int count = stoi(line);
    vector<string> inputs(count);
    for (string& input : inputs) { getline(cin, line); input = acslBatchDecode(line); }
    cout << "${marker}\\n";
    for (int i = 0; i < count; i++) {
        ostringstream captured, errors; string value; char status = 'O';
        auto originalFlags = cout.flags();
        auto originalOut = cout.rdbuf(captured.rdbuf()); auto originalErr = cerr.rdbuf(errors.rdbuf());
        try { value = solve(inputs[i]); } catch (...) { status = 'E'; }
        cout.rdbuf(originalOut); cerr.rdbuf(originalErr); cout.flags(originalFlags); cout.width(0);
        value = captured.str() + value;
        cout << i << ' ' << status << ' ' << acslBatchEncode(value) << '\\n';
    }
    cout << "END_${marker}\\n";
    return 0;
}
`;
  } else {
    driver = `    }

    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        int count = Integer.parseInt(reader.readLine());
        String[] inputs = new String[count];
        for (int i = 0; i < count; i++) inputs[i] = new String(Base64.getDecoder().decode(reader.readLine()), StandardCharsets.UTF_8);
        PrintStream destination = System.out, originalError = System.err;
        destination.println("${marker}");
        for (int i = 0; i < count; i++) {
            ByteArrayOutputStream captured = new ByteArrayOutputStream(), errors = new ByteArrayOutputStream();
            char status = 'O'; String value = "";
            System.setOut(new PrintStream(captured, true, StandardCharsets.UTF_8));
            System.setErr(new PrintStream(errors, true, StandardCharsets.UTF_8));
            try { value = Objects.requireNonNull(solve(inputs[i])); } catch (Throwable failure) { status = 'E'; }
            finally { System.setOut(destination); System.setErr(originalError); }
            value = captured.toString(StandardCharsets.UTF_8) + value;
            String encoded = Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
            destination.println(i + " " + status + " " + (encoded.isEmpty() ? "-" : encoded));
        }
        destination.println("END_${marker}");
    }
}
`;
  }
  return { sourceCode: functionSource + driver, input, marker };
}

export function readWandboxBatch(batch: WandboxBatch, execution: TestResult, tests: StoredTestCase[]): SubmissionResult {
  const failed = (verdict: SubmissionResult["verdict"], message: string): SubmissionResult => ({
    verdict, passed: 0, total: tests.length, time: execution.time, memory: execution.memory,
    tests: [{ ...execution, index: 0, verdict, hidden: tests[0].hidden, stdout: null,
      expectedOutput: tests[0].hidden ? undefined : tests[0].expectedOutput,
      // The batch stdin contains every hidden input, so never return raw runtime text.
      stderr: tests[0].hidden ? null : message,
      compileOutput: verdict === "Compilation Error" && !tests[0].hidden ? execution.compileOutput : null }],
  });
  if (execution.verdict !== "Accepted") return failed(execution.verdict, "The program did not finish the test suite. Use Run to inspect the sample output.");
  const lines = (execution.stdout ?? "").replace(/\r\n/g, "\n").trimEnd().split("\n");
  if (lines.length !== tests.length + 2 || lines[0] !== batch.marker || lines.at(-1) !== `END_${batch.marker}`) return failed("Runtime Error", "The solution did not return a valid result for every test. Use Run to inspect the sample output.");
  const results: TestResult[] = [];
  for (let i = 0; i < tests.length; i++) {
    const match = /^(\d+) ([OE]) ([A-Za-z0-9+/]+={0,2}|-)$/.exec(lines[i + 1]);
    if (!match || Number(match[1]) !== i) return failed("Runtime Error", "The solution returned an invalid test result. Use Run to inspect the sample output.");
    const stdout = match[3] === "-" ? "" : Buffer.from(match[3], "base64").toString("utf8");
    const verdict = match[2] === "E" ? "Runtime Error" : normalizeOutput(stdout) === normalizeOutput(tests[i].expectedOutput) ? "Accepted" : "Wrong Answer";
    results.push({ index: i, verdict, hidden: tests[i].hidden,
      // A wrong public answer could contain the entire batch input. Only a value
      // matching the already-public sample answer is safe to return from this path.
      stdout: !tests[i].hidden && verdict === "Accepted" ? stdout : null,
      expectedOutput: tests[i].hidden ? undefined : tests[i].expectedOutput,
      stderr: null, compileOutput: null, time: null, memory: null });
  }
  return { verdict: results.find((test) => test.verdict !== "Accepted")?.verdict ?? "Accepted",
    passed: results.filter((test) => test.verdict === "Accepted").length, total: tests.length,
    time: execution.time, memory: execution.memory, tests: results };
}
