const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {loader}=require('./helpers.cjs');
const catalog=require('../src/lib/contest1/catalog.json');
const layouts=require('../src/lib/contest1/presentation.json');
const blocks=slug=>layouts[slug].blocks;

test('all 53 source statements have checked layouts, without substituting stale content for admin edits',()=>{
 const {withStatementLayout}=loader()('src/lib/statement-layout.server.ts');
 assert.equal(Object.keys(layouts).length,53);
 for(const problem of catalog){
  assert.equal(layouts[problem.slug].sourceHash,createHash('sha256').update(problem.statement).digest('hex'));
  assert.ok(withStatementLayout(problem).statementLayout.length);
  const edited={...problem,statement:'An administrator updated this question.'};
  assert.equal(withStatementLayout(edited),edited);
  assert.equal(withStatementLayout({...problem,slug:'new-question'}).statementLayout,undefined);
  for(const b of blocks(problem.slug)){
   if(b.type==='prose'){assert.doesNotMatch(b.markdown,/```|^\s*=\s*$|less than 1050|\bP\s+th\b/);assert.ok(b.markdown.trim());}
   if(b.type==='math'){assert.match(b.html,/<math /);assert.doesNotMatch(b.html,/<script|<img|<iframe|katex-error|on\w+=/);}
   if(b.type==='figure'){const png=fs.readFileSync(path.join(__dirname,'../public',b.src));assert.equal(b.width,png.readUInt32BE(16));assert.equal(b.height,png.readUInt32BE(20));assert.ok(b.displayWidth>=80&&b.displayWidth<=650);}
   if(b.type==='table'){assert.ok(b.rows.length);assert.ok(b.rows.every(row=>row.length===b.columns.length));}
   if(b.type==='example'){assert.ok(b.input.trim());assert.ok(b.output.trim());}
  }
 }
});

test('Henry and AFCS equations keep both fractions and the equals sign together, with correct finger weights',()=>{
 const prints=blocks('acsl-prints-2010-intermediate');
 const tables=prints.filter(b=>b.type==='table');
 assert.deepEqual(tables[0].rows,[[10,1],[9,1],[8,2],[7,2],[6,4],[1,16],[2,16],[3,8],[4,8],[5,4]].map(r=>r.map(String)));
 assert.deepEqual(tables[1].rows,[16,8,4,2,1,16,8,4,2,1].map((v,i)=>[String(i+1),String(v)]));
 const equations=prints.filter(b=>b.type==='math');
 assert.ok(equations.some(b=>b.tex==='\\frac{1+2+16}{1+2}=\\frac{19}{3}'));
 assert.ok(equations.some(b=>b.tex==='\\frac{1+8}{1+8+4}=\\frac{9}{13}'));
 assert.equal(prints.filter(b=>b.type==='figure').length,0);
});

test('route and time lookup values survive table conversion, including Senior route differences',()=>{
 const table=(slug,caption)=>blocks(slug).find(b=>b.type==='table'&&b.caption===caption);
 assert.deepEqual(table('navigating-acslland-2014-intermediate','Distances between adjacent cities').rows.map(r=>+r[1]),[450,140,120,320,250,80]);
 assert.deepEqual(table('navigating-acslland-2014-senior','Distances between adjacent cities').rows,[['A to B','450'],['B to C','140'],['C to D','125'],['D to E','365'],['E to F','250'],['F to G','160'],['G to H','380'],['H to J','235'],['J to K','320']]);
 for(const division of ['junior','intermediate','senior']){
  const codes=table('time-sheets-2012-'+division,'Time codes').rows;
  assert.equal(codes.length,17);assert.deepEqual(codes[0],['9:00 AM','1']);assert.deepEqual(codes[6],['12:00 PM','7']);assert.deepEqual(codes[16],['5:00 PM','H']);
 }
});

test('redrawn triangle and clock examples retain worksheet values and displayed times',()=>{
 assert.deepEqual(blocks('numeral-triangles-2020-senior').filter(b=>b.type==='triangle').map(b=>b.rows),[
  [['A'],['13','1C'],['25','2E','37'],['40','49','52','5B'],['64','6D','76','7F','88']],
  [['ABC'],['ACB','ADA'],['AE9','AF8','B07'],['B16','B25','B34','B43']]
 ]);
 for(const problem of catalog.filter(p=>p.slug.startsWith('fibonacci-clock'))){
  const senior=problem.division==='Senior';
  for(const b of blocks(problem.slug).filter(b=>b.type==='clock')){
   const sums=[0,0,0];[...b.colors].forEach((color,i)=>{const value=[1,1,2,3,5][i];if((senior?'RYM':'RB').includes(color))sums[0]+=value;if((senior?'GYC':'GB').includes(color))sums[1]+=value*5;if(senior&&'BMC'.includes(color))sums[2]+=value*5;});
   assert.equal(sums.slice(0,senior?3:2).map(v=>String(v).padStart(2,'0')).join(':'),b.time);
  }
 }
});

test('game examples use executable multiline inputs and the canonical sample output',()=>{
 for(const slug of ['acsl-tiles-2023-intermediate','acsl-tiles-2023-senior']){
  const sample=catalog.find(p=>p.slug===slug).samples[0];const example=blocks(slug).find(b=>b.type==='example');
  assert.equal(example.input,sample.input.trim());assert.equal(example.output,sample.output.trim());
 }
 const senior=blocks('acsl-tiles-2023-senior').filter(b=>b.type==='tiles');
 assert.deepEqual(senior.at(-1).rows,[['5','56','64'],['9','99','92','23','34','45','57'],['2','27','71','18','82','22'],['3','37']]);
});

test('the Senior CHMOD example retains the following fourth-digit rules',()=>{
 const text=blocks('acsl-chmod-2015-senior').filter(b=>b.type==='prose').map(b=>b.markdown).join('\n');
 for(const phrase of ['fourth octal digit','class already has the execute permission','1 applies only to the owner','2 applies only to the group','4 applies only to the others','x is changed to an s','x is changed to a t'])assert.ok(text.includes(phrase),phrase);
});

test('essential worksheet input/output rules remain available beside the site input adapters',()=>{
 const text=slug=>blocks(slug).filter(b=>b.type==='prose').map(b=>b.markdown).join('\n');
 const digit=text('digit-reassembly-2018-junior');for(const n of [1,2,3,4,5])assert.ok(digit.includes('Input Line #'+n));assert.match(digit,/left of the two middle digits/);
 assert.match(text('numeral-triangles-2020-senior'),/sum of all of the numbers on the rth row/);
 assert.match(text('numeral-triangles-2020-senior'),/continue this process until a single hex digit/);
 for(const d of ['intermediate','senior']){assert.match(text('triangles-2007-'+d),/AB, BC, AC/);assert.match(text('triangles-2007-'+d),/DE, EF, DF/);assert.match(text('acsl-agram-2016-'+d),/lowest rank/);}
});
