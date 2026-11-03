const assert=require('node:assert/strict');
const {test}=require('node:test');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loader}=require('./helpers.cjs');

function model(source){return {getValue:()=>source,getPositionAt(offset){const lines=source.slice(0,offset).split('\n');return {lineNumber:lines.length,column:lines.at(-1).length+1};}};}

test('locked decorations follow restored code, edits with unchanged length, and model switches',()=>{
 const {trackLockedCode}=loader()('src/lib/editor-locks.ts');
 let template={prefix:'header\n',suffix:'\nfooter\n'},current=model('header\nshort\nfooter\n'),decorations,cleared=0;
 const listeners=new Map();const disposed=[];
 const editor={getModel:()=>current,createDecorationsCollection:()=>({set:value=>{decorations=value;},clear:()=>{cleared++;}}),onDidChangeModelContent:fn=>{listeners.set('content',fn);return {dispose:()=>disposed.push('content')};},onDidChangeModel:fn=>{listeners.set('model',fn);return {dispose:()=>disposed.push('model')};}};
 const tracker=trackLockedCode(editor,()=>template);
 assert.equal(decorations[1].range.startLineNumber,3);assert.equal(decorations[1].range.startColumn,1);
 current=model('header\nmy code\nmore code\nlast line\nfooter\n');listeners.get('content')();assert.equal(decorations[1].range.startLineNumber,5);assert.equal(decorations[1].range.startColumn,1);assert.equal(decorations[0].range.endLineNumber,1);assert.equal(decorations[0].range.endColumn,7);
 // Same character count, but the student's newline moved to a different place.
 current=model('header\nmy code more code\nlast line\nfooter\n');listeners.get('content')();assert.equal(decorations[1].range.startLineNumber,4);assert.equal(decorations[1].range.startColumn,1);
 template={prefix:'class Main {\n',suffix:'\n}\n'};current=model('class Main {\nuser\nuser\n}\n');listeners.get('model')();assert.equal(decorations[1].range.startLineNumber,4);assert.equal(decorations[1].range.startColumn,1);
 assert.ok(decorations.every(d=>d.options.isWholeLine&&d.options.stickiness===1));
 tracker.dispose();assert.equal(cleared,1);assert.deepEqual(disposed,['content','model']);
});

test('inline wrapper boundaries never mark a whole student line locked',()=>{
 const {lockedCodeDecorations}=loader()('src/lib/editor-locks.ts');
 const decorations=lockedCodeDecorations(model('prefixUSERsuffix'),{prefix:'prefix',suffix:'suffix'});
 assert.equal(decorations[0].range.endColumn,7);assert.equal(decorations[1].range.startColumn,11);assert.ok(decorations.every(d=>!d.options.isWholeLine));
 assert.equal(lockedCodeDecorations(model('changed header'),{prefix:'prefix',suffix:'suffix'}).length,0);
});

const problem={id:'rings-junior',slug:'rings-2024-junior',samples:[{input:'A\nB\n',output:'6 1\n'},{input:'R\nG\n',output:'3 1\n'}],timeLimitMs:2000,memoryLimitKb:128000};
const hidden={input:'PRIVATE HIDDEN INPUT',expectedOutput:'PRIVATE HIDDEN ANSWER',hidden:true};
function apiSetup({saveError=false,signedIn=true,fails=false}={}){
 const calls=[];
 const mocks={
  '@/lib/database.server':{getProblemBySlug:async()=>problem,getDatabaseTests:async()=>[...problem.samples.map(s=>({input:s.input,expectedOutput:s.output,hidden:false})),hidden]},
  '@/lib/rate-limit.server':{checkRateLimit:()=>({allowed:true})},
  '@/lib/judge0.server':{gradeSubmission:async options=>{calls.push(['grade',options]);return {verdict:fails?'Wrong Answer':'Accepted',passed:options.tests.length-(fails?1:0),total:options.tests.length,time:null,memory:null,tests:options.tests.map((t,index)=>({index,hidden:t.hidden,verdict:'Accepted',stdout:t.hidden?null:t.expectedOutput,expectedOutput:t.hidden?undefined:t.expectedOutput,stderr:null,compileOutput:null,time:null,memory:null}))};}},
  '@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:signedIn?{id:'verified-user'}:null}})}}),createSupabaseAdminClient:()=>({from:table=>({insert:async row=>{calls.push(['insert',table,row]);return {error:saveError?{message:'private database detail'}:null};}})})},
 };
 const load=loader(mocks);
 const req=mode=>({headers:new Headers({origin:'https://practice.example'}),nextUrl:new URL('https://practice.example/api/run'),json:async()=>({problemSlug:problem.slug,language:'python',code:'trusted code snapshot',mode,customInput:'custom data'})});
 return {calls,req,run:load('src/app/api/run/route.ts').POST,submit:load('src/app/api/submit/route.ts').POST};
}

test('Run grades every provided sample and ignores a stale sampleIndex',async()=>{
 const {calls,req,run}=apiSetup();const response=await run(req('sample'));assert.equal(response.status,200);
 const options=calls.find(c=>c[0]==='grade')[1];assert.equal(options.tests.length,2);assert.ok(options.tests.every(t=>!t.hidden));assert.equal(calls.some(c=>c[0]==='insert'),false);
 const result=await response.json();assert.equal(result.cases.length,2);assert.equal(result.cases[1].input,problem.samples[1].input);
});

test('Run all grades samples and hidden tests without recording a submission or exposing hidden data',async()=>{
 const {calls,req,run}=apiSetup();const response=await run(req('all'));assert.equal(response.status,200);const result=await response.json();
 assert.equal(calls.find(c=>c[0]==='grade')[1].tests.length,3);assert.equal(calls.some(c=>c[0]==='insert'),false);assert.deepEqual(result.cases[2],{index:2,hidden:true});assert.doesNotMatch(JSON.stringify(result),/PRIVATE HIDDEN/);
});

test('custom runs keep custom input separate and disable output comparison',async()=>{
 const {calls,req,run}=apiSetup();assert.equal((await run(req('custom'))).status,200);const options=calls.find(c=>c[0]==='grade')[1];assert.equal(options.tests.length,1);assert.equal(options.tests[0].input,'custom data');assert.equal(options.compareOutput,false);
});

test('Submit grades the complete suite and saves the exact source under the verified user',async()=>{
 const {calls,req,submit}=apiSetup();const response=await submit(req('custom'));assert.equal(response.status,200);assert.equal((await response.json()).saved,true);
 assert.equal(calls.find(c=>c[0]==='grade')[1].tests.length,3);const inserted=calls.find(c=>c[0]==='insert');assert.equal(inserted[1],'submissions');assert.equal(inserted[2].source_code,'trusted code snapshot');assert.equal(inserted[2].user_id,'verified-user');assert.equal(inserted[2].problem_id,problem.id);
});

test('submission save failures are reported and guest grading never claims the code was saved',async()=>{
 const failed=apiSetup({saveError:true});const response=await failed.submit(failed.req('all'));assert.equal(response.status,500);assert.match((await response.json()).error,/could not be saved/);
 const guest=apiSetup({signedIn:false});const guestResult=await guest.submit(guest.req('all'));assert.equal((await guestResult.json()).saved,false);assert.equal(guest.calls.some(c=>c[0]==='insert'),false);
});

test('Submit rejects a failing solution even if a client bypasses the disabled button',async()=>{
 const {calls,req,submit}=apiSetup({fails:true});const response=await submit(req('all'));
 assert.equal(response.status,422);assert.match((await response.json()).error,/Pass all test cases/);assert.equal(calls.some(c=>c[0]==='insert'),false);
});

test('full wrapper lines and blank lines are shaded without including the editable line',()=>{
 const {lockedCodeDecorations}=loader()('src/lib/editor-locks.ts');
 const decorations=lockedCodeDecorations(model('header\n\nfunction\nstudent\n\nfooter\n'),{prefix:'header\n\nfunction\n',suffix:'\nfooter\n'});
 assert.equal(decorations[0].range.endLineNumber,3);assert.equal(decorations[1].range.startLineNumber,5);
 assert.ok(decorations.every(d=>d.options.isWholeLine));
});

test('result boxes show each outcome, including not-run cases, without hidden input or output fields',()=>{
 const {TestCaseResults}=loader()('src/components/test-case-results.tsx');
 const result={verdict:'Wrong Answer',passed:1,total:3,time:null,memory:null,cases:[{index:0,hidden:false,input:'public input',expectedOutput:'public expected'},{index:1,hidden:true,input:'PRIVATE HIDDEN INPUT',expectedOutput:'PRIVATE HIDDEN ANSWER'},{index:2,hidden:true}],tests:[{index:0,hidden:false,verdict:'Accepted',stdout:'public expected'},{index:1,hidden:true,verdict:'Wrong Answer',stdout:'PRIVATE HIDDEN ANSWER'}]};
 const html=renderToStaticMarkup(React.createElement(TestCaseResults,{samples:problem.samples,result,running:false}));assert.match(html,/border-success/);assert.match(html,/border-danger/);assert.match(html,/Sample case 1 input/);assert.match(html,/Hidden test 1 result/);assert.match(html,/Hidden test 2 result/);assert.match(html,/Not run/);assert.doesNotMatch(html,/PRIVATE HIDDEN/);
});

test('sample-only batch grading exposes actual wrong sample output for debugging',()=>{
 const {readWandboxBatch}=loader({}, {}, {Buffer})('src/lib/wandbox-batch.server.ts');const tests=problem.samples.map(s=>({input:s.input,expectedOutput:s.output,hidden:false}));const marker='nonce';
 const execution={verdict:'Accepted',stdout:`nonce\n0 O ${Buffer.from('wrong sample answer').toString('base64')}\n1 O ${Buffer.from(tests[1].expectedOutput).toString('base64')}\nEND_nonce\n`,stderr:null,compileOutput:null,time:null,memory:null};
 const result=readWandboxBatch({marker},execution,tests);assert.equal(result.tests[0].verdict,'Wrong Answer');assert.equal(result.tests[0].stdout,'wrong sample answer');
});
