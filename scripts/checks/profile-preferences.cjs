// Isolated browser fixtures: no production accounts, uploads, or profile writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname,'../..');
const port = 3101, base = `http://localhost:${port}`;
const routes = {
 'checks-profile': `import { ProfileEditor } from '@/components/profile-editor'; export default function Page(){return <main className="mx-auto max-w-4xl p-6"><ProfileEditor email="fixture@example.invalid" initialProfile={{displayName:'Verification',fullName:'Verification Only',showName:false,aboutMe:'',avatarUrl:null,hasAvatar:false,division:'Senior',preferredLanguage:'java'}} /></main>}`,
 'checks-problems': `import { ProblemBrowser } from '@/components/problem-browser';import { problems } from '@/lib/problems';export default function Page(){return <main className="p-6"><ProblemBrowser problems={problems} solved={['next-base-2022-senior']} preferredDivision="Senior" /></main>}`,
 'checks-workspace': `import { CodeWorkspace } from '@/components/code-workspace';import { problems } from '@/lib/problems';export default function Page(){const p=problems.find(p=>p.slug==='next-base-2022-senior')!;return <CodeWorkspace problem={p} preferredLanguage="java" versions={problems.filter(p=>p.title==='Next Base')} />}`,
};
(async()=>{
 let server,browser,log=''; const created=[];
 const nextEnv=path.join(root,'next-env.d.ts'),originalNextEnv=fs.readFileSync(nextEnv,'utf8');
 try {
  for(const [route,source] of Object.entries(routes)) {
   const directory=path.join(root,'src/app',route);
   assert.equal(fs.existsSync(directory),false,'Do not overwrite existing app routes');
   fs.mkdirSync(directory);created.push(directory);fs.writeFileSync(path.join(directory,'page.tsx'),source);
  }
  server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',data=>{log=(log+data).slice(-4000);});server.stderr.on('data',data=>{log=(log+data).slice(-4000);});
  let ready=false;
  for(let i=0;i<30;i++) {try{if((await fetch(base+'/checks-profile')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}
  assert.equal(ready,true,log);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/checks-problems');
  const nextBase=page.getByRole('link',{name:/Next Base/});
  assert.equal(await nextBase.getAttribute('href'),'/problems/next-base-2022-senior');
  assert.equal(await nextBase.getByLabel('Solved',{exact:true}).count(),1);
  assert.equal(await page.getByLabel('Difficulty',{exact:true}).count(),0);assert.equal(await page.getByLabel('Topic',{exact:true}).count(),0);
  await page.getByLabel('Division',{exact:true}).selectOption('Junior');
  assert.equal(await nextBase.getAttribute('href'),'/problems/next-base-2022-junior');
  assert.equal(await nextBase.getByLabel('Not solved',{exact:true}).count(),1);
  await page.goto(base+'/checks-workspace');
  assert.equal(await page.getByLabel('Programming language',{exact:true}).inputValue(),'java');
  await page.waitForFunction(()=>window.monaco?.editor.getModels().some(m=>m.getLanguageId()==='java'));
  assert.equal(await page.evaluate(()=>window.monaco.editor.getModels().find(m=>m.getLanguageId()==='java').getValue().includes('Scanner scanner')),false);
  await page.getByLabel('Programming language',{exact:true}).selectOption('cpp');
  assert.equal(await page.getByLabel('Programming language',{exact:true}).inputValue(),'cpp');

  let persisted={displayName:'Verification',fullName:'Verification Only',showName:false,aboutMe:'',avatarUrl:null,hasAvatar:false,division:'Senior',preferredLanguage:'java'};
  const calls=[];
  await page.route('**/api/profile',async route=>{
   const req=route.request();const form=await new Request(req.url(),{method:'POST',headers:req.headers(),body:req.postDataBuffer()}).formData();
   calls.push(Array.from(form.keys()));
   if(form.get('mode')==='avatar') {persisted={...persisted,avatarUrl:form.has('avatar')?fixtureUrl:null,hasAvatar:form.has('avatar')};await route.fulfill({json:{avatarUrl:persisted.avatarUrl,hasAvatar:persisted.hasAvatar}});}
   else {persisted={...persisted,displayName:form.get('displayName'),fullName:form.get('name'),showName:form.get('showName')==='true',aboutMe:form.get('aboutMe'),division:form.get('division'),preferredLanguage:form.get('preferredLanguage')};await route.fulfill({json:persisted});}
  });
  await page.goto(base+'/checks-profile');
  const save=page.getByRole('button',{name:'Save profile',exact:true});
  assert.equal(await save.isDisabled(),true);assert.equal(await page.getByLabel('About me',{exact:true}).getAttribute('readonly'),'');
  await page.getByRole('button',{name:'Edit profile',exact:true}).click();assert.equal(await save.isDisabled(),true);
  await page.getByLabel('About me',{exact:true}).fill('Unfinished biography');
  assert.equal(await save.isEnabled(),true);assert.match(await save.getAttribute('class'),/bg-primary/);
  assert.equal(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});dispatchEvent(event);return event.defaultPrevented;}),true);
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Problems',exact:true}).click();
  assert.equal(new URL(page.url()).pathname,'/checks-profile');
  assert.equal(await page.getByLabel('About me',{exact:true}).inputValue(),'Unfinished biography');
  const dialogPromise=page.waitForEvent('dialog');await page.evaluate(()=>history.back());const backDialog=await dialogPromise;await backDialog.dismiss();
  await page.waitForFunction(()=>location.pathname==='/checks-profile');assert.equal(await page.getByLabel('About me',{exact:true}).inputValue(),'Unfinished biography');
  const fixtureUrl=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#6357e8';c.fillRect(0,0,64,64);return canvas.toDataURL('image/png');});
  const png=Buffer.from(fixtureUrl.split(',')[1],'base64');
  await page.getByRole('button',{name:'Add profile picture',exact:true}).click();
  await page.getByLabel('Upload profile picture from computer',{exact:true}).setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:png});
  await page.getByRole('heading',{name:'Adjust your picture',exact:true}).waitFor();await page.getByRole('button',{name:'Use picture',exact:true}).click();
  await page.getByText('Picture saved.',{exact:true}).waitFor();assert.equal(persisted.aboutMe,'');assert.equal(persisted.hasAvatar,true);
  assert.deepEqual(calls.at(-1).sort(),['avatar','mode']);assert.equal(await page.getByLabel('About me',{exact:true}).inputValue(),'Unfinished biography');assert.equal(await save.isEnabled(),true);
  await page.getByLabel('Division',{exact:true}).selectOption('Intermediate');await page.getByLabel('Programming language',{exact:true}).selectOption('cpp');
  await save.click();await page.getByText('Profile saved.',{exact:true}).waitFor();assert.equal(await save.isDisabled(),true);assert.match(await save.getAttribute('class'),/bg-muted/);
  assert.equal(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});dispatchEvent(event);return event.defaultPrevented;}),false);
  assert.equal(persisted.division,'Intermediate');assert.equal(persisted.preferredLanguage,'cpp');assert.equal(persisted.aboutMe,'Unfinished biography');
  await page.getByRole('button',{name:'Remove',exact:true}).click();await page.getByText('Picture removed.',{exact:true}).waitFor();assert.equal(persisted.hasAvatar,false);
  await page.screenshot({path:'/private/tmp/acsl-profile-preferences.png',fullPage:true});
  await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByLabel('About me',{exact:true}).fill('Discarded edit');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('link',{name:'Problems',exact:true}).click();await page.waitForURL('**/problems');
  await page.goto(base+'/login');await page.getByRole('button',{name:'Need an account? Register',exact:true}).click();
  await page.getByLabel('Division',{exact:true}).selectOption('Senior');await page.getByLabel('Programming language',{exact:true}).selectOption('java');
  assert.equal(await page.getByLabel('Division',{exact:true}).getAttribute('required'),'');assert.equal(await page.getByLabel('Programming language',{exact:true}).getAttribute('required'),'');
  assert.deepEqual(errors,[]);
  console.log('Isolated browser checks passed: preferred division and language, solved version checks, clean starters, edit/save states, unsaved link/back prompts, picture autosave preserving drafts, preference saves, picture removal, and registration selectors.');
 } finally {
  if(browser) await browser.close();
  if(server && server.exitCode === null && server.signalCode === null) {server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
  for(const directory of created) fs.rmSync(directory,{recursive:true});
  fs.rmSync(path.join(root,'.next/dev/types'),{recursive:true,force:true});
  fs.writeFileSync(nextEnv,originalNextEnv);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
