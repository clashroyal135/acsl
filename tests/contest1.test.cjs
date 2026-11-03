const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./helpers.cjs');
const Link = { __esModule: true, default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) };
const load = loader();
const { problems } = load('src/lib/problems.ts');
const { getBundledTests } = load('src/lib/test-cases.server.ts');
const { groupProblems } = load('src/lib/problem-groups.ts');

function find(tree,predicate) { let found; function walk(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); if (predicate(node)) found=node; walk(node.props?.children); } walk(tree); return found; }

test('catalog replaces the old six problems with 18 seasons and 53 separately judged versions', () => {
  assert.equal(problems.length, 53); assert.equal(new Set(problems.map(p => p.id)).size, 53); assert.equal(new Set(problems.map(p => p.slug)).size, 53);
  assert.equal(groupProblems(problems).length, 18);
  for (const retired of ['letter-relay','shared-signal','run-recorder','logic-stack','beacon-distance','route-ledger']) assert.equal(problems.some(p => p.slug === retired),false);
  for (const group of groupProblems(problems)) {
    assert.ok(group.year >= 2007 && group.year <= 2024); assert.equal(group.versions.length,group.year===2023?2:3);
    assert.equal(group.versions.some(p => p.division==='Junior'),group.year!==2023);
    assert.ok(group.versions.every(p => p.samples.length>0 && p.statement && p.inputSpec && p.outputSpec));
  }
});

test('every division has exactly 12 distinct hidden cases plus its public samples', () => {
  let hidden=0;
  for (const p of problems) {
    const tests=getBundledTests(p.slug,p.samples[0].input,p.samples[0].output);
    const secret=tests.filter(t=>t.hidden); assert.equal(secret.length,12,p.slug); assert.equal(new Set(secret.map(t=>t.input)).size,12,p.slug);
    assert.equal(tests.filter(t=>!t.hidden).length,p.samples.length,p.slug);
    assert.ok(secret.every(t=>t.input && t.expectedOutput),p.slug);hidden+=secret.length;
    assert.equal('tests' in p,false); assert.equal('expectedOutput' in p,false);
  }
  assert.equal(hidden,636);
});

test('the browser shows each title once with seasons and filters to available division versions', () => {
  const state=[];let index=0;
  const react={...React,useState(initial){const i=index++;if(!(i in state))state[i]=initial;return [state[i],value=>{state[i]=value;}];},useMemo:fn=>fn()};
  const { ProblemBrowser }=loader({react,'next/link':Link})('src/components/problem-browser.tsx');
  let tree;const render=()=>{index=0;tree=ProblemBrowser({problems,solved:[]});};render();
  let html=renderToStaticMarkup(tree); assert.equal((html.match(/href="\/problems\//g)||[]).length,18);assert.match(html,/2022–2023/);assert.match(html,/Showing 18 of 18 problems/);
  find(tree,n=>n.props?.['aria-label']==='Year').props.onChange({target:{value:'2022'}});render();
  html=renderToStaticMarkup(tree); assert.equal((html.match(/href="\/problems\//g)||[]).length,1);assert.match(html,/Next Base/);
  find(tree,n=>n.props?.['aria-label']==='Division').props.onChange({target:{value:'Senior'}});render();
  html=renderToStaticMarkup(tree); assert.match(html,/href="\/problems\/next-base-2022-senior"/);
  find(tree,n=>n.props?.['aria-label']==='Year').props.onChange({target:{value:'2023'}});find(tree,n=>n.props?.['aria-label']==='Division').props.onChange({target:{value:'Junior'}});render();
  assert.match(renderToStaticMarkup(tree),/No matching problems/);
});

test('division selection uses only published siblings and marks missing Junior unavailable', () => {
  const navigations=[];
  const { DivisionSelector }=loader({react:{...React,useTransition:()=>[false,fn=>fn()]},'next/navigation':{useRouter:()=>({push:path=>navigations.push(path)})}})('src/components/division-selector.tsx');
  const versions=problems.filter(p=>p.title==='ACSL Tiles');const tree=DivisionSelector({currentSlug:versions[0].slug,versions});const select=find(tree,n=>n.type==='select');
  assert.equal(find(tree,n=>n.type==='option'&&n.props.value==='unavailable-Junior').props.disabled,true);
  select.props.onChange({target:{value:versions[1].slug}});assert.equal(navigations[0],`/problems/${versions[1].slug}`);
  select.props.onChange({target:{value:'not-a-published-sibling'}});assert.equal(navigations.length,1);
});

test('switching division remounts the workspace and keeps each version submission identity', async () => {
  for(const p of problems.filter(p=>p.title==='Next Base')) {
    const Page=loader({'@/lib/database.server':{getAllProblems:async()=>problems,getProblemBySlug:async()=>p},'@/lib/admin.server':{requireAdmin:async()=>null},'@/components/code-workspace':{CodeWorkspace:()=>null}})('src/app/problems/[slug]/page.tsx').default;
    const page=await Page({params:Promise.resolve({slug:p.slug})});assert.equal(page.key,p.id);assert.equal(page.props.problem.id,p.id);assert.equal(page.props.versions.length,3);
    assert.ok(page.props.versions.every(v=>Object.keys(v).sort().join(',')==='division,id,slug'));
  }
});

test('grading bounds parallel execution, retains ordering, and redacts every hidden execution detail', async () => {
  let active=0,max=0;
  const { gradeSubmission }=loader({'@/lib/wandbox.server':{executeWithWandbox:async(code,lang,t,index)=>{
    active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,(index%3)*2));active--;
    return {index,verdict:'Accepted',stdout:t.input,expectedOutput:t.expectedOutput,stderr:t.input,compileOutput:t.input,time:0.01,memory:100,hidden:t.hidden};
  }}})('src/lib/judge0.server.ts');
  const tests=[{input:'public',expectedOutput:'public result',hidden:false},...Array.from({length:12},(_,i)=>({input:`secret-input-${i}`,expectedOutput:`secret-answer-${i}`,hidden:true}))];
  const result=await gradeSubmission({sourceCode:'trusted fixture',language:'python',tests,timeLimitMs:2000,memoryLimitKb:128000});
  assert.equal(result.total,13);assert.equal(result.passed,13);assert.equal(max,3);assert.equal(result.tests[0].stdout,'public');
  assert.deepEqual(Array.from(result.tests,t=>t.index),Array.from({length:13},(_,i)=>i));assert.doesNotMatch(JSON.stringify(result),/secret-input|secret-answer/);
});

test('public problem API never includes grading fixtures or solution code', async () => {
  const { GET }=loader({'@/lib/database.server':{getAllProblems:async()=>problems}})('src/app/api/problems/route.ts');
  const response=await GET();const json=await response.json();assert.equal(json.length,53);
  assert.ok(json.every(p=>!('tests' in p)&&!('starterCode' in p)&&!('expectedOutput' in p)));
});

test('Java fallback keeps the Main class and references while satisfying the provider filename', async () => {
  let payload;
  const { executeWithWandbox }=loader({}, {}, {AbortSignal,Error,fetch:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'0',program_output:'ok\n'})};}})('src/lib/wandbox.server.ts');
  const code='import java.util.*;\npublic class Main { public static void main(String[] args) { Main helper = new Main(); } }';
  const result=await executeWithWandbox(code,'java',{input:'',expectedOutput:'ok\n',hidden:false},0,2000,true);
  assert.equal(result.verdict,'Accepted');assert.match(payload.code,/class Main/);assert.doesNotMatch(payload.code,/public class Main/);assert.match(payload.code,/Main helper = new Main/);assert.equal(payload.code.split('\n').length,code.split('\n').length);
});

test('provider queue and compilation timeouts do not mark correct programs as time-limit failures', async () => {
  const timeout=new Error('transport timed out');timeout.name='TimeoutError';
  const { executeWithWandbox }=loader({}, {}, {AbortSignal,Error,fetch:async()=>{throw timeout;}})('src/lib/wandbox.server.ts');
  await assert.rejects(executeWithWandbox('trusted fixture','cpp',{input:'',expectedOutput:'',hidden:false},0,2000,true),/execution service timed out/);
});

test('fallback batch compiles one scaffold without embedding any private input in source', () => {
  const { buildWandboxBatch }=loader({}, {}, {Buffer})('src/lib/wandbox-batch.server.ts');
  const { defaultStarter }=load('src/lib/starters.ts');
  for (const language of ['python','cpp','java']) {
    const tests=[{input:'public input\n',expectedOutput:'public',hidden:false},{input:'private input\n\n',expectedOutput:'private',hidden:true}];
    const batch=buildWandboxBatch(defaultStarter[language],language,tests);assert.ok(batch);assert.doesNotMatch(batch.sourceCode,/private input/);
    const lines=batch.input.trimEnd().split('\n');assert.equal(lines[0],'2');assert.equal(Buffer.from(lines[2],'base64').toString(),'private input\n\n');
  }
  assert.equal(buildWandboxBatch('custom full program','python',[{},{}]),null);
});

test('batch grading never reveals hidden inputs echoed into an incorrect public answer or a runtime failure', () => {
  const { readWandboxBatch }=loader({}, {}, {Buffer})('src/lib/wandbox-batch.server.ts');
  const tests=[{input:'public',expectedOutput:'visible answer',hidden:false},{input:'private-input',expectedOutput:'private-answer',hidden:true}];
  const batch={marker:'nonce'};
  const execution={verdict:'Accepted',stdout:`nonce\n0 O ${Buffer.from('private-input').toString('base64')}\n1 O ${Buffer.from('private-answer').toString('base64')}\nEND_nonce\n`,stderr:'private-input',compileOutput:null,time:null,memory:null};
  const result=readWandboxBatch(batch,execution,tests);assert.equal(result.verdict,'Wrong Answer');assert.equal(result.passed,1);assert.doesNotMatch(JSON.stringify(result),/private-input|private-answer/);assert.equal(result.tests[0].stdout,null);
  for (const broken of [{...execution,stdout:'private-input'}, {...execution,verdict:'Runtime Error'}]) assert.doesNotMatch(JSON.stringify(readWandboxBatch(batch,broken,tests)),/private-input|private-answer/);
  const good={...execution,stdout:`nonce\n0 O ${Buffer.from('visible answer').toString('base64')}\n1 O ${Buffer.from('private-answer').toString('base64')}\nEND_nonce\n`};
  const passed=readWandboxBatch(batch,good,tests);assert.equal(passed.verdict,'Accepted');assert.equal(passed.tests[0].stdout,'visible answer');assert.equal(passed.tests[1].stdout,null);
});

test('a complete new suite uses one fallback compilation for the locked solve scaffold', async () => {
  let compilations=0;
  const { defaultStarter }=load('src/lib/starters.ts');
  const tests=[{input:'sample\n',expectedOutput:'ok\n',hidden:false},...Array.from({length:12},(_,i)=>({input:`hidden-${i}\n`,expectedOutput:String(i)+'\n',hidden:true}))];
  const { gradeSubmission }=loader({'@/lib/wandbox.server':{executeWithWandbox:async(source,language,request)=>{
    compilations++;assert.equal(request.input.split('\n')[0],'13');assert.doesNotMatch(source,/hidden-\d/);
    const marker=source.match(/ACSL_[a-f0-9]{32}/)[0];
    const stdout=marker+'\n'+tests.map((t,i)=>`${i} O ${Buffer.from(t.expectedOutput).toString('base64')}`).join('\n')+'\nEND_'+marker+'\n';
    return {index:0,verdict:'Accepted',stdout,stderr:null,compileOutput:null,time:null,memory:null,hidden:true};
  }}},{},{Buffer})('src/lib/judge0.server.ts');
  const result=await gradeSubmission({sourceCode:defaultStarter.python,language:'python',tests,timeLimitMs:2000,memoryLimitKb:128000});
  assert.equal(compilations,1);assert.equal(result.total,13);assert.equal(result.passed,13);assert.equal(result.verdict,'Accepted');
});
