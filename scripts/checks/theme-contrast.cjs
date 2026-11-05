// Browser-level contrast checks include real CSS specificity and translucent surfaces.
// Local fixtures are removed after use; no accounts or production data are changed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');

function auditContrast(){
 const context=document.createElement('canvas').getContext('2d'),cache=new Map();
 function rgba(value){if(cache.has(value))return cache.get(value);context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);const c=Array.from(context.getImageData(0,0,1,1).data);c[3]/=255;cache.set(value,c);return c;}
 const over=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
 const mix=(a,b,alpha)=>a.map((v,i)=>v*alpha+b[i]*(1-alpha));
 const bgCache=new Map();
 function background(e){if(!e)return[255,255,255];if(bgCache.has(e))return bgCache.get(e);const color=over(rgba(getComputedStyle(e).backgroundColor),background(e.parentElement));bgCache.set(e,color);return color;}
 const lum=c=>c.map(n=>n/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 const failures=[],checked=[];
 function inspect(e,text,pseudo){
  if(!text.trim()||e.closest('[hidden],[aria-hidden="true"],:disabled,[aria-disabled="true"]'))return;
  const box=e.getBoundingClientRect(),style=getComputedStyle(e,pseudo||null);
  if(box.width<=1||box.height<=1||style.visibility!=='visible'||style.display==='none')return;
  let bg=background(e);
  if(e.closest('.acsl-locked-text')){const overlay=document.querySelector('.monaco-editor .acsl-locked-line');if(overlay)bg=over(rgba(getComputedStyle(overlay).backgroundColor),bg);}
  let fg=over(rgba(style.color),bg);
  if(pseudo)fg=mix(fg,bg,Number(style.opacity));
  for(let ancestor=e;ancestor;ancestor=ancestor.parentElement){const opacity=Number(getComputedStyle(ancestor).opacity);if(opacity<1){const outside=background(ancestor.parentElement);fg=mix(fg,outside,opacity);bg=mix(bg,outside,opacity);}}
  const required=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseInt(style.fontWeight)>=700)?3:4.5;
  const actual=ratio(fg,bg);
  const result={text:text.trim().slice(0,80),selector:e.tagName.toLowerCase()+'.'+String(e.className).trim().replaceAll(' ','.'),contrast:Number(actual.toFixed(2)),required,foreground:fg.map(Math.round),background:bg.map(Math.round)};
  checked.push(result);if(actual+.01<required)failures.push(result);
 }
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const node=walker.currentNode,e=node.parentElement;if(e&&!['SCRIPT','STYLE','OPTION','TEXTAREA'].includes(e.tagName))inspect(e,node.textContent);}
 for(const e of document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]),textarea,select')){if(e.value)inspect(e,e.tagName==='SELECT'?e.selectedOptions[0]?.textContent||e.value:e.value);if(e.placeholder)inspect(e,e.placeholder,'::placeholder');}
 return {theme:document.documentElement.classList.contains('dark')?'dark':'light',checked:checked.length,minimum:Math.min(...checked.map(c=>c.contrast)),failures};
}

async function settle(page){await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);await Promise.all(document.getAnimations().filter(a=>a.constructor.name==='CSSTransition').map(a=>a.finished.catch(()=>{})));});}
async function setTheme(page,theme){
 if(await page.evaluate(theme=>document.documentElement.classList.contains('dark')!==(theme==='dark'),theme))await page.getByRole('button',{name:`Switch to ${theme} mode`,exact:true}).click();
 await page.waitForFunction(theme=>document.documentElement.classList.contains('dark')===(theme==='dark'),theme);
 await settle(page);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),theme);
 if(await page.locator('.monaco-editor').count())await page.waitForFunction(theme=>Boolean(document.querySelector('.monaco-editor.vs-dark'))===(theme==='dark'),theme);
}

(async()=>{
 let server,browser,log='';const fixtures=[];const nextEnv=path.join(root,'next-env.d.ts'),savedNextEnv=fs.readFileSync(nextEnv,'utf8');
 const base=process.env.ACSL_CHECK_URL||'http://localhost:3102',local=!process.env.ACSL_CHECK_URL;
 try{
  if(local){
   const directory=path.join(root,'src/app/checks-theme');assert.equal(fs.existsSync(directory),false);fs.mkdirSync(directory);fixtures.push(directory);
   fs.writeFileSync(path.join(directory,'page.tsx'),`import Fixture from './fixture';import {problems} from '@/lib/problems';import {withStatementLayout} from '@/lib/statement-layout.server';export default function Page(){return <Fixture problem={withStatementLayout(problems.find(p=>p.slug==='draft-picks-2011-senior')!)} />}`);
   fs.writeFileSync(path.join(directory,'fixture.tsx'),`"use client";
import {useState} from 'react';import {Button} from '@/components/ui/button';import {Badge} from '@/components/ui/badge';import {Card} from '@/components/ui/card';import {ProfileEditor} from '@/components/profile-editor';import {LoginForm} from '@/components/login-form';import {AdminProblemEditor} from '@/components/admin-problem-editor';import {ProblemStatement} from '@/components/problem-statement';import {TestCaseResults} from '@/components/test-case-results';import type {Problem} from '@/lib/types';
export default function Fixture({problem}:{problem:Problem}){const [draft,setDraft]=useState({...problem,isPublished:false,isBundled:true,tests:[{input:'1',expectedOutput:'1',hidden:true}]});return <main className="mx-auto max-w-6xl space-y-8 p-6">
<Card className="space-y-4 p-6"><h1 className="text-3xl font-bold">Theme contrast</h1><p className="text-muted-foreground">Secondary text and placeholder colors</p><div className="flex gap-3">{(['default','secondary','outline','ghost','danger'] as const).map(variant=><Button key={variant} variant={variant}>{variant} action</Button>)}<Button disabled>Disabled action</Button></div><div className="flex gap-3"><Badge className="border-success/25 bg-success/10 text-success">Accepted</Badge><Badge className="border-warning/25 bg-warning/10 text-warning">In progress</Badge><Badge className="border-danger/25 bg-danger/10 text-danger">Error</Badge></div><input placeholder="Placeholder text" className="rounded-lg border border-border bg-background p-3"/><p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-danger">Validation error message</p><div className="prose-acsl"><p>Inline <code>solve(input)</code> example</p><pre><code>Markdown code block</code></pre></div><pre aria-label="Submitted source code" className="bg-code p-5 text-code-foreground"><code>return input;</code></pre><textarea aria-label="Problem JSON" defaultValue={'{"title":"Example"}'} className="bg-code p-4 text-code-foreground"/></Card>
<Card><ProblemStatement problem={problem}/></Card>
{(['Accepted','In progress','Wrong Answer'] as const).map(verdict=><Card key={verdict} className="p-5"><TestCaseResults samples={problem.samples} running={false} submitted result={{verdict,saved:true,passed:1,total:3,time:0.2,memory:1000,cases:[{index:0,hidden:false,input:'A',expectedOutput:'A'},{index:1,hidden:false,input:'B',expectedOutput:'B'},{index:2,hidden:true}],tests:[{index:0,hidden:false,verdict:'Accepted',stdout:'A',stderr:null,compileOutput:null,time:0.1,memory:1000},{index:1,hidden:false,verdict:'Compilation Error',stdout:null,stderr:'Example error',compileOutput:'Example diagnostic',time:null,memory:null},{index:2,hidden:true,verdict:'Wrong Answer',stdout:null,stderr:null,compileOutput:null,time:null,memory:null}]}}/></Card>)}
<ProfileEditor email="theme@example.invalid" initialProfile={{displayName:'Theme profile',fullName:'Theme Check',showName:false,aboutMe:'About me text',avatarUrl:null,hasAvatar:false,division:'Senior',preferredLanguage:'java'}}/><LoginForm initialMode="register"/><AdminProblemEditor value={draft} onChange={setDraft}/></main>}`);
   server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3102'],{cwd:root,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>{log=(log+d).slice(-3000)});server.stderr.on('data',d=>{log=(log+d).slice(-3000)});
   let ready=false;for(let i=0;i<30;i++){try{if((await fetch(base+'/checks-theme')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}assert.equal(ready,true,log);
  }
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const reports=[];
  const paths=local?['/checks-theme','/','/problems','/problems/rings-2024-junior','/login','/reset-password','/leaderboard','/about','/profile','/submissions','/admin','/missing-theme-check']:['/','/problems','/problems/rings-2024-junior','/login','/reset-password','/leaderboard','/about','/profile','/submissions','/admin'];
  for(const route of paths){await page.goto(base+route);if(route.includes('/problems/rings'))await page.locator('.monaco-editor').waitFor({timeout:30000});for(const theme of ['light','dark']){await setTheme(page,theme);const report=await page.evaluate(auditContrast);reports.push({route,...report});if(report.failures.length)console.log(JSON.stringify({route,...report}));
    if(route==='/checks-theme'){await page.locator('button.bg-primary').first().hover();await settle(page);const hover=await page.evaluate(auditContrast);if(hover.failures.length)console.log(JSON.stringify({route:route+' (hover)',...hover}));reports.push({route:route+' (hover)',...hover});await page.mouse.move(0,0);}
    if(route.includes('/problems/rings')){const examples=page.locator('article .code-block').first();await examples.scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/acsl-theme-'+theme+'.png'});}
  }}
  await page.setViewportSize({width:390,height:844});
  for(const route of ['/problems','/login','/problems/rings-2024-junior']){await page.goto(base+route);if(route.includes('/rings'))await page.locator('.monaco-editor').waitFor();for(const theme of ['light','dark']){await setTheme(page,theme);const report=await page.evaluate(auditContrast);reports.push({route:route+' (mobile)',...report});if(report.failures.length)console.log(JSON.stringify({route:route+' (mobile)',...report}));}}
  const failures=reports.flatMap(r=>r.failures.map(f=>({route:r.route,theme:r.theme,...f})));fs.writeFileSync('/private/tmp/acsl-theme-contrast.json',JSON.stringify(reports,null,2));assert.deepEqual(failures,[]);
  console.log('Theme contrast passed: '+reports.length+' page/theme states, '+reports.reduce((n,r)=>n+r.checked,0)+' text checks.');
 }finally{if(browser)await browser.close();if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}for(const directory of fixtures)fs.rmSync(directory,{recursive:true});if(local){fs.rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});fs.writeFileSync(nextEnv,savedNextEnv);}}
})().catch(e=>{console.error(e);process.exitCode=1;});
