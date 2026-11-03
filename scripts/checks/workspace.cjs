const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { loader } = require('../../tests/helpers.cjs');
const { defaultStarter, splitStarterCode } = loader()('src/lib/starters.ts');
const catalog = require('../../src/lib/contest1/catalog.json');
const problem = catalog.find(p => p.slug === 'rings-2024-junior');
const template = splitStarterCode(defaultStarter.python);
const body = `    lines = data.strip().splitlines()

    points = {'A': 1, 'R': 1, 'O': 3, 'G': 3, 'B': 6}
    scores = []

    for line in lines:
        total = 0
        for color in line:
            total += points[color]
        scores.append(total)

    scores.sort(reverse=True)
    return f"{scores[0]} {scores[1]}"
`;
const source = template.prefix + body + template.suffix;
const base = process.env.ACSL_CHECK_URL || 'http://localhost:3100';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ key, body }) => localStorage.setItem(key, JSON.stringify({ python: body })), { key: `acsl-function-v3:${problem.slug}`, body });
    async function checkLocks() {
      await page.waitForFunction(() => window.monaco?.editor.getModels().some(m => m.getValue().includes('scores.sort') && m.getAllDecorations().filter(d => d.options.className === 'acsl-locked-line').length === 2));
      const actual = await page.evaluate(() => {
        const model = window.monaco.editor.getModels().find(m => m.getValue().includes('scores.sort'));
        return { source: model.getValue(), ranges: model.getAllDecorations().filter(d => d.options.className === 'acsl-locked-line').map(d => ({ start: model.getOffsetAt(d.range.getStartPosition()), end: model.getOffsetAt(d.range.getEndPosition()) })) };
      });
      assert.equal(actual.source, source);
      assert.deepEqual(actual.ranges.sort((a,b) => a.start-b.start), [{ start: 0, end: template.prefix.length }, { start: source.length-template.suffix.length, end: source.length }]);
    }
    await page.goto(base + '/problems/' + problem.slug);
    await checkLocks();
    await page.goto(base + '/submissions');
    await page.goBack();
    await checkLocks();
    await page.reload();
    await checkLocks();
    await page.getByLabel('Programming language').selectOption('java');
    await page.getByLabel('Programming language').selectOption('python');
    await checkLocks();

    if (process.env.ACSL_EXECUTION_CHECK === '1') for (const mode of ['sample', 'all']) {
      const response = await page.request.post(base + '/api/run', { headers:{ origin:base }, data:{ problemSlug:problem.slug, language:'python', code:source, mode }, timeout:60000 });
      const result = await response.json();
      assert.equal(response.status(), 200, JSON.stringify(result));
      assert.equal(result.verdict, 'Accepted', JSON.stringify(result));
      assert.equal(result.total, problem.samples.length + (mode === 'all' ? 12 : 0));
      assert.equal(result.cases.length, result.total);
      assert.ok(result.cases.filter(c=>c.hidden).every(c=>Object.keys(c).sort().join(',') === 'hidden,index'));
      console.log(`Real judge: ${mode} ${result.passed}/${result.total} passed.`);
    }

    const calls = [];
    for (const route of ['run', 'submit']) await page.route('**/api/' + route, async request => {
      const data = request.request().postDataJSON();
      calls.push({ route, ...data });
      assert.equal(data.code, source);
      const cases = problem.samples.map((s,index) => ({ index, hidden:false, input:s.input, expectedOutput:s.output }));
      if (data.mode === 'all') for(let i=0;i<12;i++) cases.push({ index:cases.length, hidden:true });
      const tests = cases.map((c,index) => ({ index, hidden:c.hidden, verdict:index === 1 ? 'Wrong Answer' : 'Accepted', stdout:c.hidden ? null : index === 1 ? 'wrong answer' : c.expectedOutput, stderr:null, compileOutput:null, time:null, memory:null }));
      await request.fulfill({ json: { verdict:'Wrong Answer', passed:cases.length-1, total:cases.length, time:null, memory:null, cases, tests, saved:route==='submit' } });
    });
    await page.getByRole('button', { name:'Run', exact:true }).click();
    await page.getByRole('region', { name:'Sample case 1', exact:true }).getByText('Passed',{exact:true}).waitFor();
    assert.equal(calls.at(-1).mode, 'sample');
    assert.equal(await page.getByRole('region', { name:/Sample case/ }).count(), problem.samples.length);
    assert.match(await page.getByRole('region', { name:'Sample case 1', exact:true }).getAttribute('class'), /border-success/);
    assert.match(await page.getByRole('region', { name:'Sample case 2', exact:true }).getAttribute('class'), /border-danger/);
    assert.equal(await page.getByLabel('Sample case 2 your output', { exact:true }).inputValue(), 'wrong answer');
    await page.getByRole('button', { name:'Run all test cases', exact:true }).click();
    await page.getByLabel('Hidden test 12 result', { exact:true }).waitFor();
    assert.equal(calls.at(-1).mode, 'all');
    assert.equal(calls.filter(c=>c.route==='submit').length, 0);
    assert.equal(await page.getByRole('region', { name:/Hidden test/ }).count(), 12);
    await page.getByRole('button', { name:'Submit', exact:true }).click();
    await page.getByRole('link', { name:'View submitted solutions', exact:true }).waitFor();
    assert.equal(calls.filter(c=>c.route==='submit').length, 1);
    await checkLocks();
    await page.screenshot({ path:'/private/tmp/acsl-workspace-results-desktop.png', fullPage:true });
    await page.setViewportSize({ width:390, height:844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path:'/private/tmp/acsl-workspace-results-mobile.png', fullPage:true });
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: restored code locks, submissions navigation, reload, language switch, sample/all/submit actions, colored results, hidden-case boxes, desktop and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
