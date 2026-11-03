const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { loader } = require('./helpers.cjs');

function workspace(isAdmin) {
  const effects = [], listeners = new Map();
  const document = { addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: name => listeners.delete(name) };
  const Editor = () => null;
  const react = { ...React, useState: value => [value, () => {}], useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn, useEffect: fn => effects.push(fn) };
  const { CodeWorkspace } = loader({ react, '@monaco-editor/react': { __esModule: true, default: Editor }, '@/components/problem-statement': { ProblemStatement: () => null } }, {}, { document, Element: class Element {} })('src/components/code-workspace.tsx');
  const problem = { slug: 'test', title: 'Test', starterCode: { python: '', cpp: '', java: '' }, samples: [], timeLimitMs: 1000, memoryLimitKb: 64000 };
  const tree = CodeWorkspace({ problem, isAdmin });
  // The clipboard effect follows draft restoration, and owns all clipboard listeners.
  const cleanup = effects[1]();
  let editor; function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (node.type === Editor) editor = node; walk(node.props?.children); } walk(tree);
  return { listeners, cleanup, editor };
}

test('admins get native clipboard events and the editor context menu', () => {
  const { listeners, editor } = workspace(true);
  assert.equal(listeners.size, 0); assert.equal(editor.props.options.contextmenu, true);
});

test('students retain external clipboard blocking and listeners are removed on cleanup', () => {
  const { listeners, cleanup, editor } = workspace(false);
  assert.equal(editor.props.options.contextmenu, false);
  for (const type of ['copy', 'cut', 'paste']) {
    let blocked = false, stopped = false;
    listeners.get(type)({ type, preventDefault: () => { blocked = true; }, stopPropagation: () => { stopped = true; }, target: null });
    assert.equal(blocked, true); assert.equal(stopped, true);
  }
  cleanup(); assert.equal(listeners.size, 0);
});

test('problem workspace clipboard access follows the verified server admin role', async () => {
  for (const admin of [null, {}]) {
    const Page = loader({ '@/lib/admin.server': { requireAdmin: async () => admin }, '@/lib/database.server': { getProblemBySlug: async () => ({ slug: 'test' }) }, '@/components/code-workspace': { CodeWorkspace: () => null } })('src/app/problems/[slug]/page.tsx').default;
    const page = await Page({ params: Promise.resolve({ slug: 'test' }) }); assert.equal(page.props.isAdmin, Boolean(admin));
  }
});
