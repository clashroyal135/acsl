const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../src/lib/contest1/catalog.json');
const originals=require('../scripts/contest1/originals.json');
const sources=require('../scripts/contest1/sources.json');
const normalize=s=>Array.from(s.toLowerCase()).filter(c=>/[\p{L}\p{N}]/u.test(c)).join('');
const header=/20\d\d[-–]20\d\d\s*[●•]?\s*Contest\s*1:.*?Division/gi;

test('all 53 source problem descriptions preserve original wording without publishing test-data pages',()=>{
 assert.equal(Object.keys(originals).length,53);
 for(const problem of catalog){
  const original=originals[problem.slug];assert.equal(problem.statement,original.statement);
  const source=sources.find(s=>s.id===original.sourceId);assert.ok(source);
  const raw=source.text.replace(/\r\n/g,'\n');const start=/PROBLEM\s*:/i.exec(raw);const remainder=raw.slice(start.index+start[0].length);const stop=/^\s*INPUT\s*:/m.exec(remainder);
  const expected=remainder.slice(0,stop.index).replace(header,'');
  const prose=original.statement.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replaceAll('```text','').replaceAll('```','');
  assert.equal(normalize(prose),normalize(expected),problem.slug);
  assert.doesNotMatch(problem.statement,/^TEST\s+(DATA|INPUT|OUTPUT)/im);
 }
});

test('every recovered source figure is a real local PNG and belongs to its source worksheet',()=>{
 let count=0;
 for(const [slug,original] of Object.entries(originals))for(const figure of original.figures){
  count++;assert.ok(figure.src.startsWith('/problems/figures/'+slug+'-'));assert.ok(figure.alt.length>10);assert.ok(figure.page>=1);
  const image=fs.readFileSync(path.join(__dirname,'../public',figure.src));assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
 assert.equal(count,49);
});
