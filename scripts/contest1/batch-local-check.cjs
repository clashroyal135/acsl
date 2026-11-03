// Only executes trusted, fixed echo functions to check framing and Unicode transport.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const {loader}=require('../../tests/helpers.cjs');
const load=loader({}, {}, {Buffer});const {buildWandboxBatch,readWandboxBatch}=load('src/lib/wandbox-batch.server.ts');const {defaultStarter,splitStarterCode}=load('src/lib/starters.ts');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'acsl-batch-'));
const inputs=['hello\n','','line1\nline2\n','é漢字😀\n','0\n','ends without newline','\n\n','space separated values\n','99999999999999999999999999999999999999999999999999\n','A B C\n','trailing spaces  \n','tab\tvalue\n','last\n'];
const tests=inputs.map((input,i)=>({input,expectedOutput:input,hidden:i>0}));
for (const language of ['python','cpp','java']) {
 const {prefix,suffix}=splitStarterCode(defaultStarter[language]);const body=language==='python'?'    return data\n':language==='cpp'?'    cout << hex; return input;\n':'        return input;\n';
 const batch=buildWandboxBatch(prefix+body+suffix,language,tests);let output;
 if(language==='python'){const file=path.join(dir,'main.py');fs.writeFileSync(file,batch.sourceCode);output=execFileSync('python3',[file],{input:batch.input,encoding:'utf8'});}
 if(language==='cpp'){const file=path.join(dir,'main.cpp');fs.writeFileSync(file,batch.sourceCode.replace('#include <bits/stdc++.h>','#include <iostream>\n#include <sstream>\n#include <vector>\n#include <string>\n#include <algorithm>'));execFileSync('clang++',['-std=c++17',file,'-o',path.join(dir,'main')]);output=execFileSync(path.join(dir,'main'),[],{input:batch.input,encoding:'utf8'});}
 if(language==='java'){fs.writeFileSync(path.join(dir,'Main.java'),batch.sourceCode);execFileSync('javac',['--release','17',path.join(dir,'Main.java')]);output=execFileSync('java',['-cp',dir,'Main'],{input:batch.input,encoding:'utf8'});}
 const execution={verdict:'Accepted',stdout:output,stderr:null,compileOutput:null,time:null,memory:null};const result=readWandboxBatch(batch,execution,tests);assert.equal(result.verdict,'Accepted',JSON.stringify(result));assert.equal(result.passed,13);console.log(language+': 13 real echo cases passed, including blank input and Unicode');
}
fs.rmSync(dir,{recursive:true});
