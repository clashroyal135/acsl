const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./helpers.cjs');

test('problem rows open the preferred division while any division solve marks the whole question', () => {
  const { ProblemBrowser } = loader()('src/components/problem-browser.tsx');
  const problems = ['Junior','Intermediate','Senior'].map(division => ({ id:division, slug:division.toLowerCase(), division, title:'Example', year:2024 }));
  const render = solved => renderToStaticMarkup(React.createElement(ProblemBrowser,{ problems, solved, preferredDivision:'Senior' }));
  const unsolved = render([]);
  assert.match(unsolved,/href="\/problems\/senior"/); assert.match(unsolved,/Solved\?/); assert.match(unsolved,/aria-label="Not solved"/);
  assert.doesNotMatch(unsolved, /aria-label="Solved"|All difficulties|All topics|rounded-full|<span>Divisions<\/span>/);
  assert.match(render(['Senior']),/aria-label="Solved"/);assert.match(render(['Junior']),/aria-label="Solved"/);
});

test('an unavailable preferred division falls back to an available version', () => {
  const { preferredVersion } = loader()('src/lib/problem-groups.ts');
  const versions = [{ division:'Intermediate', slug:'intermediate' },{ division:'Senior', slug:'senior' }];
  assert.equal(preferredVersion(versions,'Senior').slug,'senior'); assert.equal(preferredVersion(versions,'Junior').slug,'intermediate');
  assert.equal(preferredVersion([],'Junior'),undefined);
});

test('public preferences are validated and legacy profiles use stable defaults', () => {
  const { validatePreferences, profilePreferences } = loader()('src/lib/preferences.ts');
  assert.equal(validatePreferences('Senior','cpp').preferredLanguage,'cpp');
  assert.throws(()=>validatePreferences('Invalid','python'),/division/); assert.throws(()=>validatePreferences('Junior','javascript'),/language/);
  assert.equal(profilePreferences(null).division,'Junior'); assert.equal(profilePreferences({division:'Senior',preferred_language:'java'}).preferredLanguage,'java');
});

test('workspace preferences come from the verified account profile', async () => {
  const client={auth:{getUser:async()=>({data:{user:{id:'verified-user'}}})},from:table=>{assert.equal(table,'profiles');return {select:columns=>{assert.equal(columns,'division,preferred_language');return {eq:(key,id)=>{assert.equal(key,'id');assert.equal(id,'verified-user');return {maybeSingle:async()=>({data:{division:'Senior',preferred_language:'java'}})};}};}};}};
  const {getViewerPreferences}=loader({'@/lib/supabase/server':{createSupabaseServerClient:async()=>client}})('src/lib/preferences.server.ts');
  const result=await getViewerPreferences();assert.equal(result.division,'Senior');assert.equal(result.preferredLanguage,'java');
});

test('provided starters accept a string directly without a Scanner or prewritten input parser', () => {
  const { defaultStarter, splitStarterCode } = loader()('src/lib/starters.ts');
  for (const source of Object.values(defaultStarter)) {
    const body = splitStarterCode(source).editable;
    assert.doesNotMatch(body,/Scanner|istringstream|splitlines|StringBuilder|ostringstream/);
    assert.match(body,/return ""/);
  }
});

test('untouched old placeholders upgrade while written code and custom starters stay intact', () => {
  const { defaultStarter, splitStarterCode, restoreStarterDraft } = loader()('src/lib/starters.ts');
  const old='        Scanner scanner = new Scanner(input);\n        StringBuilder output = new StringBuilder();\n        // Write your solution here.\n        return output.toString();\n';
  const current=splitStarterCode(defaultStarter.java).editable;
  assert.equal(restoreStarterDraft('java',old,current),current);
  assert.equal(restoreStarterDraft('java',old+'        // My code\n',current),old+'        // My code\n');
  assert.equal(restoreStarterDraft('java',old,'custom starter'),old);
});
