const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./helpers.cjs');

function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function find(tree, predicate) { let found; function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (predicate(node)) found = node; walk(node.props?.children); } walk(tree); return found; }
const tick = () => new Promise(setImmediate);

test('problems catalogue and personal progress load concurrently', async () => {
  const catalogue = deferred(); let progressStarted = false;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'current-user' } } }) },
    from: () => ({ select: () => ({ eq: (key, user) => { assert.equal(key, 'user_id'); assert.equal(user, 'current-user'); return { eq: async () => { progressStarted = true; return { data: [{ problem_id: 'one' }, { problem_id: 'one' }] }; } }; } }) }),
  };
  const Page = loader({ '@/lib/database.server': { getAllProblems: () => catalogue.promise }, '@/lib/supabase/server': { createSupabaseServerClient: async () => client } })('src/app/problems/page.tsx').default;
  const pending = Page(); await tick();
  assert.equal(progressStarted, true, 'progress should start before the catalogue returns');
  catalogue.resolve([]); const page = await pending;
  const browser = find(page, node => node.props?.solved); assert.equal(browser.props.solved.length, 1); assert.equal(browser.props.solved[0], 'one');
});

test('submission history and problem titles load concurrently after authentication', async () => {
  const history = deferred(); let catalogueStarted = false;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'current-user' } } }) },
    from: () => ({ select: () => ({ eq: (key, user) => { assert.equal(key, 'user_id'); assert.equal(user, 'current-user'); return { order: () => ({ limit: () => history.promise }) }; } }) }),
  };
  const Page = loader({ '@/lib/database.server': { getAllProblems: async () => { catalogueStarted = true; return []; } }, '@/lib/supabase/server': { createSupabaseServerClient: async () => client } })('src/app/submissions/page.tsx').default;
  const pending = Page(); await tick(); assert.equal(catalogueStarted, true, 'titles should load before history returns');
  history.resolve({ data: [] }); await pending;
});

test('problem content and verified administrator permissions load concurrently', async () => {
  const content = deferred(); let roleStarted = false;
  const Page = loader({ '@/lib/database.server': { getAllProblems: async () => [], getProblemBySlug: () => content.promise }, '@/lib/admin.server': { requireAdmin: async () => { roleStarted = true; return {}; } }, '@/components/code-workspace': { CodeWorkspace: () => null } })('src/app/problems/[slug]/page.tsx').default;
  const pending = Page({ params: Promise.resolve({ slug: 'one' }) }); await tick(); assert.equal(roleStarted, true);
  content.resolve({ slug: 'one' }); assert.equal((await pending).props.isAdmin, true);
});

test('admin tabs stay mounted after their first visit and only the active tab is shown', () => {
  const state = []; let index = 0, tree;
  const Problems = () => null, Students = () => null;
  const react = { ...React, useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; } };
  const { AdminDashboard } = loader({ react, '@/components/admin-problems-panel': { AdminProblemsPanel: Problems }, '@/components/admin-students-panel': { AdminStudentsPanel: Students } })('src/components/admin-dashboard.tsx');
  const render = () => { index = 0; tree = AdminDashboard(); };
  const panel = type => find(tree, node => node.type === 'div' && node.props.children?.type === type);
  const click = label => { find(tree, node => node.props?.children?.includes?.(label)).props.onClick(); render(); };
  render(); assert.ok(panel(Problems)); assert.equal(panel(Students), undefined);
  click(' Accounts & progress'); assert.equal(panel(Problems).props.hidden, true); assert.equal(panel(Students).props.hidden, false);
  click(' Problems'); assert.equal(panel(Problems).props.hidden, false); assert.equal(panel(Students).props.hidden, true);
  click(' Accounts & progress'); assert.ok(panel(Problems)); assert.ok(panel(Students));
});

test('page loading fallback exposes its status without announcing decorative placeholders', () => {
  const Loading = loader()('src/app/loading.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Loading));
  assert.match(html, /role="status"/); assert.match(html, /Loading page/); assert.match(html, /aria-busy="true"/); assert.match(html, /aria-hidden="true"/);
});
