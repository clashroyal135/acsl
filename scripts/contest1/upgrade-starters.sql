update public.problems set starter_code=jsonb_set(starter_code, '{python}', '"import sys\n\ndef solve(data: str) -> str:\n    # ACSL_EDITABLE_START\n    # data contains the input for this test case.\n    return \"\"\n    # ACSL_EDITABLE_END\n\nif __name__ == \"__main__\":\n    sys.stdout.write(solve(sys.stdin.read()))\n"'::jsonb) where starter_code->>'python'='import sys

def solve(data: str) -> str:
    # ACSL_EDITABLE_START
    lines = data.strip().splitlines()
    # Write your solution here.
    return ""
    # ACSL_EDITABLE_END

if __name__ == "__main__":
    sys.stdout.write(solve(sys.stdin.read()))
';
update public.problems set starter_code=jsonb_set(starter_code, '{cpp}', '"#include <bits/stdc++.h>\nusing namespace std;\n\nstring solve(const string& input) {\n    // ACSL_EDITABLE_START\n    // input contains the input for this test case.\n    return \"\";\n    // ACSL_EDITABLE_END\n}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());\n    cout << solve(input);\n    return 0;\n}\n"'::jsonb) where starter_code->>'cpp'='#include <bits/stdc++.h>
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
';
update public.problems set starter_code=jsonb_set(starter_code, '{java}', '"import java.io.*;\nimport java.nio.charset.StandardCharsets;\nimport java.util.*;\n\npublic class Main {\n    static String solve(String input) {\n        // ACSL_EDITABLE_START\n        // input contains the input for this test case.\n        return \"\";\n        // ACSL_EDITABLE_END\n    }\n\n    public static void main(String[] args) throws Exception {\n        String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);\n        System.out.print(solve(input));\n    }\n}\n"'::jsonb) where starter_code->>'java'='import java.io.*;
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
';