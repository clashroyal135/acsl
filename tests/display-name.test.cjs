const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { loader } = require('./helpers.cjs');

function endpoint(options = {}) {
  const calls = [];
  const GET = loader({
    '@/lib/supabase/server': { createSupabaseAdminClient: () => options.noClient ? null : { rpc: async (...args) => { calls.push(args); return { data: options.available ?? false, error: options.error ?? null }; } } },
    '@/lib/rate-limit.server': { checkRateLimit: () => ({ allowed: !options.limited, retryAfter: 30 }) },
  })('src/app/api/auth/display-name/route.ts').GET;
  return { calls, get: (name = ' Bob ') => GET({ headers: new Headers(), nextUrl: new URL(`https://example.com/api/auth/display-name?name=${encodeURIComponent(name)}`) }) };
}

test('availability returns only a non-cacheable boolean and normalizes the input', async () => {
  for (const available of [true, false]) {
    const api = endpoint({ available }); const response = await api.get();
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { available });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(api.calls[0][0], 'admin_display_name_available'); assert.equal(api.calls[0][1].p_display_name, 'Bob');
  }
});

test('availability rejects invalid input, throttles checks, and fails closed on database errors', async () => {
  for (const name of ['', ' ', 'x'.repeat(61)]) { const api = endpoint(); assert.equal((await api.get(name)).status, 400); assert.equal(api.calls.length, 0); }
  for (const options of [{ noClient: true }, { error: { message: 'private database detail' } }]) {
    const response = await endpoint(options).get(); assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private database detail/);
  }
  const api = endpoint({ limited: true }); const response = await api.get(); assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '30'); assert.equal(api.calls.length, 0);
});

test('availability client encodes names and does not treat failed checks as available', async () => {
  const calls = [];
  const { isDisplayNameAvailable } = loader({}, {}, { fetch: async (...args) => { calls.push(args); return { ok: true, json: async () => ({ available: false }) }; } })('src/lib/display-name.ts');
  assert.equal(await isDisplayNameAvailable(' A&B '), false); assert.equal(calls[0][0], '/api/auth/display-name?name=A%26B'); assert.equal(calls[0][1].cache, 'no-store');
  const failed = loader({}, {}, { fetch: async () => ({ ok: false, json: async () => ({ error: 'Try later' }) }) })('src/lib/display-name.ts');
  await assert.rejects(failed.isDisplayNameAvailable('Bob'), /Try later/);
});

function registration({ checks = [true], signupError = null } = {}) {
  const state = []; let index = 0, tree, signups = 0, checked = 0;
  const react = { ...React, useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; } };
  const { LoginForm } = loader({ react, 'next/navigation': { useRouter: () => ({}) }, '@/lib/display-name': { isDisplayNameAvailable: async () => checks[checked++] }, '@/lib/supabase/client': { createSupabaseBrowserClient: () => ({ auth: { signUp: async () => { signups++; return { error: signupError }; } } }) } }, {}, { window: { location: { origin: 'http://localhost:3000' } } })('src/components/login-form.tsx');
  const render = () => { index = 0; tree = LoginForm({ initialMode: 'register' }); };
  function find(predicate) { let found; function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (predicate(node)) found = node; walk(node.props?.children); } walk(tree); return found; }
  render();
  const set = (label, value) => { find(node => node.props?.label === label).props.onChange(value); render(); };
  for (const [label, value] of [['Display name', 'Handle'], ['Full name', 'Personal Name'], ['Email address', 'test@example.com'], ['Password', 'password123']]) set(label, value);
  return { set, counts: () => ({ signups, checked }), submit: async () => { await find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); render(); return find(node => node.props?.role === 'status')?.props.children; } };
}

test('taken display names block registration and simultaneous claims get a friendly error', async () => {
  const taken = registration({ checks: [false] }); assert.match(await taken.submit(), /already taken/); assert.equal(taken.counts().signups, 0);
  const race = registration({ checks: [true, false], signupError: { message: 'Database error saving new user' } }); assert.match(await race.submit(), /already taken/); assert.equal(race.counts().signups, 1); assert.equal(race.counts().checked, 2);
});

test('all four registration fields must be filled before signup or availability checks', async () => {
  for (const label of ['Display name', 'Full name', 'Email address', 'Password']) {
    const form = registration(); form.set(label, ''); assert.ok(await form.submit()); assert.deepEqual(form.counts(), { signups: 0, checked: 0 });
  }
});
