const assert=require('node:assert/strict');
const {test}=require('node:test');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loader}=require('./helpers.cjs');
const problems=[
 {id:'q1-jr',slug:'q1-jr',title:'One',year:2024,division:'Junior'},
 {id:'q1-sr',slug:'q1-sr',title:'One',year:2024,division:'Senior'},
 {id:'q2-jr',slug:'q2-jr',title:'Two',year:2024,division:'Junior'},
 {id:'q3-jr',slug:'q3-jr',title:'One',year:2023,division:'Junior'},
];

test('one accepted division solves the question once, with separate seasons kept distinct',()=>{
 const {questionProgress}=loader()('src/lib/problem-groups.ts');
 const result=questionProgress(problems,['q1-jr','q1-sr','q1-sr'],['q1-sr','q2-jr']);
 assert.equal(result.length,3);assert.equal(result.filter(q=>q.solved).length,1);assert.equal(result.filter(q=>q.attempted).length,2);
 assert.equal(result.find(q=>q.year===2023).solved,false);
});

test('profile progress counts question families across division and language submissions',async()=>{
 const submissions=[{problem_id:'q1-jr',language:'java',verdict:'Accepted'},{problem_id:'q1-sr',language:'python',verdict:'Accepted'},{problem_id:'q2-jr',language:'cpp',verdict:'In progress'}];
 const client={auth:{getUser:async()=>({data:{user:{id:'owner',email:'owner@example.invalid',user_metadata:{}}}})},from:table=>({select:()=>({eq:()=>table==='profiles'?{maybeSingle:async()=>({data:{display_name:'Owner',full_name:'Owner Name',show_name:false,avatar_path:null,division:'Senior',preferred_language:'java'}})}:Promise.resolve({data:submissions})})})};
 const Page=loader({'next/navigation':{useRouter:()=>({refresh(){}})},'@/lib/supabase/server':{createSupabaseServerClient:async()=>client},'@/lib/database.server':{getAllProblems:async()=>problems}})('src/app/profile/page.tsx').default;
 const html=renderToStaticMarkup(await Page());
 assert.match(html,/aria-label="Questions solved" aria-valuenow="1" aria-valuemin="0" aria-valuemax="3"/);assert.doesNotMatch(html,/Progress by division|Divisions active|Senior · Java/);
});

test('leaderboards count a question only once across accepted versions and languages',async()=>{
 const client={from:table=>({select:()=>table==='profiles'?Promise.resolve({data:[{id:'owner',display_name:'Owner'}]}):{eq:async()=>({data:[{user_id:'owner',problem_id:'q1-jr'},{user_id:'owner',problem_id:'q1-sr'},{user_id:'owner',problem_id:'q2-jr'}]})}})};
 const Page=loader({'@/lib/supabase/server':{createSupabaseAdminClient:()=>client},'@/lib/database.server':{getAllProblems:async()=>problems}})('src/app/leaderboard/page.tsx').default;
 const html=renderToStaticMarkup(await Page());assert.match(html,/Owner<\/a><span[^>]*>2<\/span>/);
});

test('unfinished submission results and historical verdicts use a yellow In progress status',()=>{
 const {submissionStatus,submissionStatusClass}=loader()('src/lib/submission-status.ts');
 for(const verdict of ['Wrong Answer','Compilation Error','Runtime Error','In progress']){assert.equal(submissionStatus(verdict),'In progress');assert.match(submissionStatusClass(verdict),/text-warning/);}
 const {TestCaseResults}=loader()('src/components/test-case-results.tsx');
 const html=renderToStaticMarkup(React.createElement(TestCaseResults,{samples:[],submitted:true,running:false,result:{verdict:'In progress',saved:true,passed:0,total:1,cases:[{index:0,hidden:true}],tests:[{index:0,hidden:true,verdict:'Wrong Answer'}],time:null,memory:null}}));
 assert.match(html,/bg-warning\/10/);assert.match(html,/In progress/);assert.match(html,/Submission saved/);
});
