const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function loader(mocks = {}, env = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, {
      exports, process: { env }, URL, Date, console,
      require(name) {
        if (name in mocks) return mocks[name];
        if (name === "server-only") return {};
        if (name === "next/cache") return { unstable_noStore() {} };
        if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
        return require(name);
      },
    }, { filename: absolute });
    return exports;
  }
  return load;
}
const plain = value => JSON.parse(JSON.stringify(value));
const uuid = "00000000-0000-0000-0000-000000000001";
const request = (body, origin = "https://practice.example") => ({
  headers: new Headers({ origin }), nextUrl: new URL("https://practice.example/api/admin/problems"), json: async () => body,
});

function problemModule() { return loader()("src/lib/admin-problems.server.ts"); }

test("admin alias resolves to an email without changing ordinary logins", () => {
  const { loginEmail } = loader()("src/lib/login-identity.ts");
  assert.equal(loginEmail(" ADMIN "), "chrisgaorb@gmail.com");
  assert.equal(loginEmail(" student@example.com "), "student@example.com");
  assert.equal(loader({}, { NEXT_PUBLIC_ADMIN_EMAIL: "owner@example.com" })("src/lib/login-identity.ts").loginEmail("admin"), "owner@example.com");
});

test("requireAdmin rejects missing, forged, student, and errored sessions", async () => {
  for (const scenario of ["missing", "invalid", "student", "profile-error", "no-service", "admin"]) {
    let adminLookups = 0;
    const admin = { from: () => { adminLookups++; return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: scenario === "student" ? "student" : "admin" }, error: scenario === "profile-error" ? Error("DB unavailable") : null }) }) }) }; } };
    const module = loader({ "@/lib/supabase/server": {
      createSupabaseServerClient: async () => scenario === "missing" ? null : { auth: { getUser: async () => ({ data: { user: { id: uuid, user_metadata: { role: "admin" } } }, error: scenario === "invalid" ? Error("bad JWT") : null }) } },
      createSupabaseAdminClient: () => scenario === "no-service" ? null : admin,
    } })("src/lib/admin.server.ts");
    assert.equal(await module.requireAdmin(), scenario === "admin" ? admin : null, scenario);
    if (["missing", "invalid"].includes(scenario)) assert.equal(adminLookups, 0);
  }
});

test("every admin API denies access before querying private data", async () => {
  const load = loader({ "@/lib/admin.server": { requireAdmin: async () => null } });
  const problems = load("src/app/api/admin/problems/route.ts");
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) assert.equal((await problems[method](request({}))).status, 403, method);
  for (const route of ["students/route.ts", "students/[id]/route.ts", "submissions/[id]/route.ts"]) {
    assert.equal((await load(`src/app/api/admin/${route}`).GET(request({}), { params: Promise.resolve({ id: uuid }) })).status, 403, route);
  }
});

test("problem mutation APIs reject requests from another origin", async () => {
  let checked = false;
  const module = loader({ "@/lib/admin.server": { requireAdmin: async () => { checked = true; return {}; } } })("src/app/api/admin/problems/route.ts");
  for (const method of ["POST", "PATCH", "DELETE"]) assert.equal((await module[method](request({}, "https://attacker.example"))).status, 403);
  assert.equal(checked, false);
});

test("problem validation normalizes editing data and rejects invalid publication", () => {
  const { bundledAdminProblems, validateAdminProblem, problemToRow } = problemModule();
  const original = bundledAdminProblems()[0];
  const normalized = validateAdminProblem(original);
  assert.equal(normalized.id, original.id);
  assert.equal(normalized.tests.length, original.tests.length);
  assert.equal(problemToRow(normalized).is_published, true);
  assert.equal("tests" in problemToRow(normalized), false);
  for (const changes of [{ samples: [] }, { tests: [] }, { isPublished: "true" }, { tests: [{ input: "", expectedOutput: "1", hidden: "yes" }] }, { slug: "Bad Slug" }, { slug: "renamed-bundle" }, { id: "new-id" }, { timeLimitMs: 0 }, { starterCode: {} }, { difficulty: ["Easy"] }]) {
    assert.throws(() => validateAdminProblem({ ...original, ...changes }), undefined, JSON.stringify(changes));
  }
  const draft = validateAdminProblem({ ...original, id: "", slug: "custom-problem", isPublished: false, samples: [], tests: [], injected_column: "ignored" });
  assert.equal(draft.isPublished, false);
  assert.equal("injected_column" in problemToRow(draft), false);
});

test("admin problem rows round-trip to the editor without losing hidden tests", async () => {
  const module = problemModule();
  const original = module.bundledAdminProblems()[0];
  const row = { ...module.problemToRow(original), title: "Edited title", is_published: false,
    test_cases: original.tests.map((test, position) => ({ input: test.input, expected_output: test.expectedOutput, is_hidden: test.hidden, position })).reverse() };
  const data = await module.getAdminProblems({ from: () => ({ select: () => ({ order: async () => ({ data: [row], error: null }) }) }) });
  const edited = data.find(item => item.id === original.id);
  assert.equal(edited.title, "Edited title"); assert.equal(edited.isPublished, false);
  assert.deepEqual(plain(edited.tests), plain(original.tests));
  assert.equal(module.validateAdminProblem(edited).tests.length, original.tests.length);
});

test("unpublished bundled problems disappear from listings and direct lookup", async () => {
  let rows = [];
  const client = { from: () => ({ select: () => ({ order: async () => ({ data: rows, error: null }), eq: (_key, slug) => ({ maybeSingle: async () => ({ data: rows.find(row => row.slug === slug) ?? null, error: null }) }) }) }) };
  const load = loader({ "@/lib/supabase/server": { createSupabaseAdminClient: () => client } });
  const database = load("src/lib/database.server.ts");
  const original = (await database.getAllProblems())[0];
  const row = problemModule().problemToRow({ ...original, isPublished: false });
  rows = [row];
  assert.equal((await database.getAllProblems()).some(problem => problem.slug === original.slug), false);
  assert.equal(await database.getProblemBySlug(original.slug), undefined);
  rows = [{ ...row, is_published: true, title: "Revised" }];
  assert.equal((await database.getProblemBySlug(original.slug)).title, "Revised");
  assert.equal((await database.getAllProblems()).filter(problem => problem.slug === original.slug).length, 1);
});

test("database failures do not reveal unpublished bundled content via fallback", async () => {
  const client = { from: () => ({ select: () => ({ order: async () => ({ data: null, error: Error("offline") }), eq: () => ({ maybeSingle: async () => ({ data: null, error: Error("offline") }) }) }) }) };
  const module = loader({ "@/lib/supabase/server": { createSupabaseAdminClient: () => client } })("src/lib/database.server.ts");
  await assert.rejects(module.getAllProblems(), /availability/);
  await assert.rejects(module.getProblemBySlug("letter-relay"), /availability/);
});

test("problem POST validates the entire batch before saving and uses atomic RPCs", async () => {
  const original = problemModule().bundledAdminProblems()[0];
  const calls = [];
  const module = loader({ "@/lib/admin.server": { requireAdmin: async () => ({ rpc: async (...args) => { calls.push(args); return { data: { id: original.id }, error: null }; } }) } })("src/app/api/admin/problems/route.ts");
  assert.equal((await module.POST(request([original, { slug: "invalid" }]))).status, 400);
  assert.equal(calls.length, 0);
  const response = await module.POST(request(original));
  assert.equal(response.status, 201); assert.equal(calls.length, 1); assert.equal(calls[0][0], "admin_save_problem");
  assert.deepEqual(plain(calls[0][1].p_tests), plain(original.tests));
});

test("student summaries include empty accounts and do not depend on truncated submission rows", async () => {
  const stats = { user_id: uuid, submission_count: 2400, solved_problem_ids: ["one"], attempted_problem_ids: ["one", "two"], last_submission_at: "2026-11-02T12:00:00Z" };
  const module = loader()("src/lib/admin-students.server.ts");
  const result = await module.studentSummaries({
    from: table => { assert.equal(table, "profiles"); return { select: () => ({ in: async () => ({ data: [{ id: uuid, display_name: "Learner", role: "student" }], error: null }) }) }; },
    rpc: async (name, args) => { assert.equal(name, "admin_student_progress"); assert.equal(args.p_user_ids.length, 2); return { data: [stats], error: null }; },
  }, [{ id: uuid, email: "learner@example.com", created_at: "2026-01-01" }, { id: "new-user", email: "new@example.com", created_at: "2026-11-02" }]);
  assert.equal(result[0].progress.submission_count, 2400);
  assert.equal(result[1].progress.submission_count, 0);
  assert.equal(result[1].progress.solved_problem_ids.length, 0);
});

test("source endpoint returns one selected submission with no shared caching", async () => {
  let selected = "";
  const module = loader({ "@/lib/admin.server": { requireAdmin: async () => ({ from: table => { assert.equal(table, "submissions"); return { select: columns => { selected = columns; return { eq: (key, value) => { assert.equal(key, "id"); assert.equal(value, uuid); return { maybeSingle: async () => ({ data: { id: uuid, source_code: "print(1)" }, error: null }) }; } }; } }; } }) } })("src/app/api/admin/submissions/[id]/route.ts");
  assert.equal((await module.GET(request({}), { params: Promise.resolve({ id: "invalid" }) })).status, 400);
  const response = await module.GET(request({}), { params: Promise.resolve({ id: uuid }) });
  assert.equal(response.status, 200); assert.match(selected, /source_code/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.json()).source_code, "print(1)");
});
