const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { NextRequest } = require("next/server");
const { loader } = require("./helpers.cjs");
const { canonicalSiteUrl, siteOrigin, SITE_ORIGIN } = loader()("src/lib/site-url.ts");
const deployOrigin = "https://6ae917758d942822e1fceef6--acsl.netlify.app";

test("deploy, branch, and preview addresses use the stable host without losing the current page", () => {
  for (const host of ["6ae917758d942822e1fceef6--acsl.netlify.app", "deploy-preview-42--acsl.netlify.app", "staging--acsl.netlify.app"]) {
    for (const path of ["/", "/login?mode=forgot", "/problems/letter-relay", "/profile/00000000-0000-0000-0000-000000000001", "/api/auth/reset-password?code=test%2Bcode&next=%2Fprofile#section"]) {
      const source = new URL(`https://${host}${path}`); const result = canonicalSiteUrl(source.href);
      assert.equal(result.origin, SITE_ORIGIN); assert.equal(result.pathname, source.pathname); assert.equal(result.search, source.search); assert.equal(result.hash, source.hash);
    }
  }
});

test("canonical redirects have a fixed destination and cannot be turned into open redirects", () => {
  const result = canonicalSiteUrl(`${deployOrigin}//attacker.example/login?next=https://attacker.example`);
  assert.equal(result.origin, SITE_ORIGIN); assert.equal(result.pathname, "//attacker.example/login");
  assert.equal(canonicalSiteUrl("http://acsl.netlify.app:8080/login").href, `${SITE_ORIGIN}/login`);
  assert.equal(canonicalSiteUrl(`${SITE_ORIGIN}/login`).href, `${SITE_ORIGIN}/login`);
});

test("localhost and unrelated domains keep their origin and port", () => {
  for (const origin of ["http://localhost:3000", "http://127.0.0.1:3213", "https://practice.example", "https://acsl.netlify.app.attacker.example", "https://other.netlify.app"]) {
    assert.equal(canonicalSiteUrl(`${origin}/login`).href, `${origin}/login`); assert.equal(siteOrigin(origin), origin);
  }
});

test("proxy redirects aliases before touching authentication or creating cookies", async () => {
  let authCalls = 0;
  const { proxy } = loader({ "@supabase/ssr": { createServerClient: () => { authCalls++; throw Error("Auth must not run on the deployment domain"); } } }, { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key" })("src/proxy.ts");
  for (const path of ["/login", "/problems?division=Junior", "/api/auth/reset-password?code=test-code"]) {
    const response = await proxy(new NextRequest(`${deployOrigin}${path}`));
    assert.equal(response.status, 308); assert.equal(response.headers.get("location"), `${SITE_ORIGIN}${path}`); assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(authCalls, 0);
});

test("proxy leaves stable and local requests alone when Supabase is unconfigured", async () => {
  const { proxy } = loader()("src/proxy.ts");
  for (const origin of [SITE_ORIGIN, "http://localhost:3000"]) {
    const response = await proxy(new NextRequest(`${origin}/login`)); assert.equal(response.status, 200); assert.equal(response.headers.get("location"), null);
  }
  const redirected = await proxy(new NextRequest(`${deployOrigin}/login`)); assert.equal(redirected.status, 308);
});

async function submitAuth(mode, origin) {
  let index = 0, states = [], payload;
  const mockReact = { ...React, useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; } };
  const { LoginForm } = loader({ react: mockReact, "next/navigation": { useRouter: () => ({}) }, "@/lib/supabase/client": { createSupabaseBrowserClient: () => ({ auth: {
    signUp: async value => { payload = value; return { error: null }; },
    resetPasswordForEmail: async (email, options) => { payload = { email, options }; return { error: null }; },
  } }) } }, {}, { window: { location: { origin } } })("src/components/login-form.tsx");
  let tree;
  function render() { index = 0; tree = LoginForm({ initialMode: mode }); }
  function find(predicate) { let found; function walk(node) { if (!node || typeof node !== "object") return; if (Array.isArray(node)) return node.forEach(walk); if (predicate(node)) found = node; walk(node.props?.children); } walk(tree); return found; }
  render();
  for (const [label, value] of [["Email address", "learner@example.com"], ["Display name", "Learner"], ["Name", "Personal Name"], ["Password", "password123"]]) {
    const field = find(node => node.props?.label === label); if (field) { field.props.onChange(value); render(); }
  }
  await find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  return payload;
}

test("signup confirmation and recovery emails use the stable host even from a deployment URL", async () => {
  for (const origin of [SITE_ORIGIN, deployOrigin, "http://localhost:3000"]) {
    const expected = origin === "http://localhost:3000" ? origin : SITE_ORIGIN;
    assert.equal((await submitAuth("register", origin)).options.emailRedirectTo, `${expected}/login`);
    assert.equal((await submitAuth("forgot", origin)).options.redirectTo, `${expected}/api/auth/reset-password`);
  }
});

test("recovery and sign-out responses cannot send users back to a deployment hostname", async () => {
  const load = loader({ "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }), signOut: async () => ({ error: null }) } }) } });
  const reset = await load("src/app/api/auth/reset-password/route.ts").GET(new NextRequest(`${deployOrigin}/api/auth/reset-password?code=test-code`));
  assert.equal(reset.headers.get("location"), `${SITE_ORIGIN}/reset-password`);
  const invalid = await load("src/app/api/auth/reset-password/route.ts").GET(new NextRequest(`${deployOrigin}/api/auth/reset-password`));
  assert.equal(invalid.headers.get("location"), `${SITE_ORIGIN}/reset-password?error=invalid_link`);
  const signout = await load("src/app/api/auth/signout/route.ts").POST(new NextRequest(`${deployOrigin}/api/auth/signout`, { method: "POST" }));
  assert.equal(signout.status, 303); assert.equal(signout.headers.get("location"), `${SITE_ORIGIN}/`);
});

test("canonical redirects use the public Host header when Next.js normalizes the request URL", async () => {
  const { proxy } = loader()("src/proxy.ts");
  const response = await proxy(new NextRequest("http://localhost:3000/login?mode=forgot", { headers: { host: "6ae917758d942822e1fceef6--acsl.netlify.app" } }));
  assert.equal(response.status, 308); assert.equal(response.headers.get("location"), `${SITE_ORIGIN}/login?mode=forgot`);
  const stable = await proxy(new NextRequest("http://localhost:3000/login", { headers: { host: "acsl.netlify.app" } }));
  assert.equal(stable.status, 200); assert.equal(stable.headers.get("location"), null);
  const rewritten = await proxy(new NextRequest(`${deployOrigin}/login`, { headers: { host: "acsl.netlify.app" } }));
  assert.equal(rewritten.status, 200); assert.equal(rewritten.headers.get("location"), null);
});

test("auth responses use the stable Host header behind a reverse proxy", async () => {
  const load = loader({ "@/lib/supabase/server": { createSupabaseServerClient: async () => null } });
  const reset = await load("src/app/api/auth/reset-password/route.ts").GET(new NextRequest("http://localhost:3000/api/auth/reset-password", { headers: { host: "acsl.netlify.app" } }));
  assert.equal(reset.headers.get("location"), `${SITE_ORIGIN}/reset-password?error=invalid_link`);
  const signout = await load("src/app/api/auth/signout/route.ts").POST(new NextRequest("http://localhost:3000/api/auth/signout", { method: "POST", headers: { host: "acsl.netlify.app" } }));
  assert.equal(signout.headers.get("location"), `${SITE_ORIGIN}/`);
});
