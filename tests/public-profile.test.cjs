const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loader } = require("./helpers.cjs");
const id = "00000000-0000-0000-0000-000000000001";
const Link = { __esModule: true, default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) };

function setup({ showName = false, adminViewer = false } = {}) {
  const columns = [];
  const client = {
    from: table => { assert.equal(table, "profiles"); return { select: select => { columns.push(select); return { eq: (key, value) => { assert.equal(key, "id"); assert.equal(value, id); return { maybeSingle: async () => ({ data: { id, display_name: "PublicHandle", full_name: "Private Legal Name", show_name: showName, about_me: "Learning algorithms", avatar_path: null, email: "private@example.com", role: "student" }, error: null }) }; } }; } }; },
    rpc: async (name, args) => { assert.equal(name, "admin_student_progress"); assert.equal(args.p_user_ids[0], id); return { data: [{ user_id: id, submission_count: 19, solved_problem_ids: ["one", "unpublished"], attempted_problem_ids: ["one", "two", "unpublished"] }], error: null }; },
  };
  const module = loader({
    "@/lib/supabase/server": { createSupabaseAdminClient: () => client },
    "@/lib/admin.server": { requireAdmin: async () => adminViewer ? client : null },
    "@/lib/database.server": { getAllProblems: async () => [{ id: "one", slug: "one", title: "One", division: "Junior" }, { id: "two", slug: "two", title: "Two", division: "Senior" }] },
  })("src/lib/public-profile.server.ts");
  return { get: () => module.getPublicProfile(id), module, columns };
}

test("hidden names and other private account fields never enter public profile data", async () => {
  const result = await setup().get();
  assert.equal(result.displayName, "PublicHandle"); assert.equal(result.fullName, null); assert.equal(result.nameIsPrivate, false);
  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /Private Legal Name|private@example.com|unpublished|source_code/);
  assert.equal("email" in result, false); assert.equal("role" in result, false);
  assert.equal(result.solvedCount, 1); assert.equal(result.attemptedCount, 2); assert.equal(result.submissionCount, 19);
});

test("name visibility can be enabled while administrators can always see the name", async () => {
  const visible = await setup({ showName: true }).get(); assert.equal(visible.fullName, "Private Legal Name"); assert.equal(visible.nameIsPrivate, false);
  const admin = await setup({ adminViewer: true }).get(); assert.equal(admin.fullName, "Private Legal Name"); assert.equal(admin.nameIsPrivate, true);
});

test("invalid public profile IDs are rejected before reading account data", async () => {
  const { module, columns } = setup(); assert.equal(await module.getPublicProfile("not-a-user-id"), null); assert.equal(columns.length, 0);
});

test("the public profile page renders only the name allowed by its server projection", async () => {
  for (const showName of [false, true]) {
    const profile = await setup({ showName }).get();
    const Page = loader({ "next/link": Link, "next/navigation": { notFound() { throw Error("not found"); } }, "@/lib/public-profile.server": { getPublicProfile: async () => profile } })("src/app/profile/[id]/page.tsx").default;
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id }) }));
    assert.match(html, /PublicHandle/); assert.match(html, /Learning algorithms/);
    if (showName) assert.match(html, /Private Legal Name/); else assert.doesNotMatch(html, /Private Legal Name/);
    assert.doesNotMatch(html, /private@example.com|source_code/);
  }
});

test("leaderboards use display names and link to profiles without revealing personal names", async () => {
  const client = { from: table => ({ select: columns => {
    if (table === "profiles") { assert.equal(columns, "id,display_name"); return Promise.resolve({ data: [{ id, display_name: "PublicHandle", full_name: "Private Legal Name" }] }); }
    assert.equal(table, "submissions"); return { eq: async () => ({ data: [{ user_id: id, problem_id: "one" }] }) };
  } }) };
  const Page = loader({ "next/link": Link, "@/lib/supabase/server": { createSupabaseAdminClient: () => client } })("src/app/leaderboard/page.tsx").default;
  const html = renderToStaticMarkup(await Page());
  assert.match(html, /PublicHandle/); assert.match(html, new RegExp(`/profile/${id}`)); assert.doesNotMatch(html, /Private Legal Name/);
});

test("profile validation keeps display name independent of private name and rejects invalid visibility", () => {
  const { validateProfileText } = loader()("src/lib/profile.ts");
  const result = validateProfileText(" PublicHandle ", " Personal Name ", false, " About ");
  assert.equal(result.displayName, "PublicHandle"); assert.equal(result.fullName, "Personal Name"); assert.equal(result.showName, false);
  assert.throws(() => validateProfileText("Handle", "", false, ""), /Full name must/);
  assert.throws(() => validateProfileText("Handle", "", true, ""), /Full name must/);
  assert.throws(() => validateProfileText("Handle", "Name", "true", ""), /Choose whether/);
  assert.throws(() => validateProfileText("Handle", "x".repeat(61), false, ""), /Full name must/);
});

test("registration sends separate display and personal names to the signup trigger", async () => {
  let state = [], index = 0, payload;
  const mockReact = { ...React, useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; } };
  const { LoginForm } = loader({ "@/lib/display-name": { isDisplayNameAvailable: async () => true }, react: mockReact, "next/navigation": { useRouter: () => ({}) }, "@/lib/supabase/client": { createSupabaseBrowserClient: () => ({ auth: { signUp: async value => { payload = value; return { error: null }; } } }) } }, {}, { window: { location: { origin: "http://localhost:3000" } } })("src/components/login-form.tsx");
  let tree;
  function render() { index = 0; tree = LoginForm({ initialMode: "register" }); }
  function find(predicate) { let found; function walk(node) { if (!node || typeof node !== "object") return; if (Array.isArray(node)) return node.forEach(walk); if (predicate(node)) found = node; walk(node.props?.children); } walk(tree); return found; }
  render();
  for (const [label, value] of [["Display name", " PublicHandle "], ["Full name", " Personal Name "], ["Email address", "learner@example.com"], ["Password", "password123"]]) { find(node => node.props?.label === label).props.onChange(value); render(); }
  await find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(payload.options.data.display_name, "PublicHandle"); assert.equal(payload.options.data.full_name, "Personal Name");
});
