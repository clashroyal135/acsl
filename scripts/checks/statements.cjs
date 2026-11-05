// Review every division version at reading-pane and mobile widths, in both themes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const catalog=require('../../src/lib/contest1/catalog.json');
const root=path.resolve(__dirname,'../..');
const output=process.env.ACSL_STATEMENT_OUTPUT||'/private/tmp/acsl-statement-review';

function inspect(){
 const article=document.querySelector('article.prose-acsl'),bounds=article.getBoundingClientRect(),failures=[];
 for(const element of article.querySelectorAll('*')){
  const style=getComputedStyle(element),box=element.getBoundingClientRect();
  if(style.display==='none'||!box.width||!box.height||element.closest('annotation,details:not([open])'))continue;
  if(box.left<bounds.left-1||box.right>bounds.right+1)failures.push({type:'outside-pane',tag:element.tagName,text:element.textContent.slice(0,100),width:box.width});
  // SVG text uses drawing coordinates; its client/scroll metrics are not HTML boxes.
  if(element instanceof HTMLElement&&element.clientWidth>0&&element.scrollWidth>element.clientWidth+2)failures.push({type:'horizontal-scroll',tag:element.tagName,text:element.textContent.slice(0,100)});
 }
 for(const e of article.querySelectorAll('p')){
  if(e.textContent.trim()==='=')failures.push({type:'orphan-equals'});
  if(getComputedStyle(e).lineHeight!=='normal'&&parseFloat(getComputedStyle(e).lineHeight)/parseFloat(getComputedStyle(e).fontSize)<1.4)failures.push({type:'tight-prose'});
 }
 const constraints=Array.from(article.querySelectorAll('section')).find(s=>s.querySelector('h2')?.textContent==='Constraints');
 for(const li of constraints.querySelectorAll('li'))if(/^[•*-]\s/.test(li.textContent.trim()))failures.push({type:'duplicate-bullet',text:li.textContent});
 return {failures,images:article.querySelectorAll('img').length,tables:article.querySelectorAll('table').length,equations:article.querySelectorAll('math').length,height:bounds.height,statementHeight:article.querySelector('.statement-body').getBoundingClientRect().bottom-bounds.top};
}
(async()=>{
 let server,browser,log='';const fixture=path.join(root,'src/app/checks-statements'),env=path.join(root,'next-env.d.ts'),savedEnv=fs.readFileSync(env,'utf8');
 const base=process.env.ACSL_CHECK_URL||'http://localhost:3103',local=!process.env.ACSL_CHECK_URL;
 try{
  fs.mkdirSync(output,{recursive:true});
  if(local){
   assert.equal(fs.existsSync(fixture),false);fs.mkdirSync(fixture);
   fs.writeFileSync(path.join(fixture,'page.tsx'),`import {problems} from '@/lib/problems';import {withStatementLayout} from '@/lib/statement-layout.server';import {ProblemStatement} from '@/components/problem-statement';export default async function Page({searchParams}:{searchParams:Promise<{slug:string}>}){const {slug}=await searchParams;const p=problems.find(p=>p.slug===slug)||problems[0];return <main style={{maxWidth:620,margin:'1rem auto'}}><h1 style={{padding:'0 20px',fontSize:22,fontWeight:700}}>{p.title} · {p.division}</h1><ProblemStatement problem={withStatementLayout(p)}/></main>}`);
   server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3103'],{cwd:root,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>log=(log+d).slice(-4000));server.stderr.on('data',d=>log=(log+d).slice(-4000));
   let ready=false;for(let i=0;i<45;i++){try{if((await fetch(base+'/checks-statements')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert.ok(ready,log);
  }
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage();const reports=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [620,360]){
   await page.setViewportSize({width,height:1000});
   for(const problem of catalog){
    await page.goto(base+(local?'/checks-statements?slug=':'/problems/')+problem.slug);
    const article=page.locator('article.prose-acsl');await article.waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('article img')).map(img=>{img.loading='eager';return img.decode();}));});
    for(const theme of ['light','dark']){
     await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
     await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);await Promise.all(document.getAnimations().filter(a=>a.constructor.name==='CSSTransition').map(a=>a.finished.catch(()=>{})));});
     const report={slug:problem.slug,width,theme,...await page.evaluate(inspect)};reports.push(report);
     if(report.failures.length)console.log(JSON.stringify(report));
     if((width===620&&theme==='light')||(width===360&&theme==='dark'))await article.screenshot({path:path.join(output,`${problem.slug}-${width}-${theme}.png`),animations:'disabled',style:'header, nextjs-portal { visibility: hidden !important; }'});
    }
   }
   console.log(`Checked all ${catalog.length} statements at ${width}px in both themes.`);
  }
  if(local){for(const slug of ['acsl-prints-2010-intermediate','navigating-acslland-2014-intermediate','draft-picks-2011-senior','acsl-chmod-2015-senior','digit-reassembly-2018-junior','numeral-triangles-2020-senior']){
   await page.setViewportSize({width:768,height:1000});await page.goto(base+'/problems/'+slug);await articleReady(page);assert.equal(await page.locator('article .statement-body pre').count(),0);const report=await page.evaluate(inspect);assert.deepEqual(report.failures,[],slug+' (tablet workspace)');
  }}
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({reports,errors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(reports.flatMap(r=>r.failures.map(f=>({slug:r.slug,width:r.width,theme:r.theme,...f}))),[]);
  console.log(`Passed ${reports.length} statement layouts; saved ${catalog.length*2} full statement screenshots to ${output}.`);
 }finally{if(browser)await browser.close();if(server&&server.exitCode===null&&server.signalCode===null){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}if(local){fs.rmSync(fixture,{recursive:true,force:true});fs.rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});fs.writeFileSync(env,savedEnv);}}
})().catch(e=>{console.error(e);process.exitCode=1});

async function articleReady(page){await page.locator('article.prose-acsl').waitFor();await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('article img')).map(img=>{img.loading='eager';return img.decode();}));});}
