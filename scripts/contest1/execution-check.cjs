const assert=require('node:assert/strict');
const fs=require('node:fs');
const { loader }=require('../../tests/helpers.cjs');
const load=loader();const {problems}=load('src/lib/problems.ts');const {splitStarterCode}=load('src/lib/starters.ts');
const problem=problems.find(p=>p.slug==='next-base-2022-senior');
const bodies={
 python:`    result = []
    for line in data.splitlines():
        count, base, start = line.split()
        base = int(base)
        value = int(start, base)
        histogram = [0] * base
        for number in range(value, value + int(count)):
            while number:
                number, digit = divmod(number, base)
                histogram[digit] += 1
        result.append(str(max(histogram)))
    return "\\n".join(result)
`,
 cpp:`    istringstream in(input);
    ostringstream out;
    int count, base;
    string value;
    const string digits = "0123456789ABCDEF";
    while (in >> count >> base >> value) {
        vector<long long> histogram(base, 0);
        for (int i = 0; i < count; i++) {
            for (char c : value) histogram[digits.find(c)]++;
            int pos = (int)value.size() - 1;
            while (pos >= 0 && (int)digits.find(value[pos]) == base - 1) value[pos--] = '0';
            if (pos < 0) value = "1" + value;
            else value[pos] = digits[digits.find(value[pos]) + 1];
        }
        out << *max_element(histogram.begin(), histogram.end()) << '\\n';
    }
    return out.str();
`,
 java:`        Scanner scanner = new Scanner(input);
        StringBuilder output = new StringBuilder();
        while (scanner.hasNext()) {
            int count = scanner.nextInt(), base = scanner.nextInt();
            java.math.BigInteger value = new java.math.BigInteger(scanner.next(), base);
            long[] histogram = new long[base];
            for (int i = 0; i < count; i++) {
                String digits = value.toString(base);
                for (int j = 0; j < digits.length(); j++) histogram[Character.digit(digits.charAt(j), base)]++;
                value = value.add(java.math.BigInteger.ONE);
            }
            long maximum = 0;
            for (long entry : histogram) maximum = Math.max(maximum, entry);
            output.append(maximum).append("\\n");
        }
        return output.toString();
`};
async function main(){
 const base=process.env.ACSL_CHECK_URL||'http://localhost:3100';
 const sources={};for(const language of Object.keys(bodies)){const {prefix,suffix}=splitStarterCode(problem.starterCode[language]);sources[language]=prefix+bodies[language]+suffix;}
 const results=await Promise.all(Object.keys(bodies).map(async language=>{
  const response=await fetch(base+'/api/run',{method:'POST',headers:{'Content-Type':'application/json',origin:base},body:JSON.stringify({problemSlug:problem.slug,language,code:sources[language],mode:'sample'})});
  const result=await response.json();assert.equal(response.status,200,JSON.stringify({language,result}));assert.equal(result.verdict,'Accepted',JSON.stringify({language,result}));console.log(language+' sample accepted');return {language,verdict:result.verdict};
 }));
 const response=await fetch(base+'/api/submit',{method:'POST',headers:{'Content-Type':'application/json',origin:base},body:JSON.stringify({problemSlug:problem.slug,language:'cpp',code:sources.cpp})});const submission=await response.json();
 assert.equal(response.status,200,JSON.stringify(submission));assert.equal(submission.verdict,'Accepted',JSON.stringify(submission));assert.equal(submission.passed,13);assert.equal(submission.total,13);
 assert.equal(submission.tests.filter(t=>t.hidden).length,12);assert.ok(submission.tests.filter(t=>t.hidden).every(t=>t.stdout===null&&t.stderr===null&&t.expectedOutput===undefined&&t.compileOutput===null));
 const report={runs:results,submission:{problem:problem.slug,language:'cpp',passed:submission.passed,total:submission.total,hiddenDetailsRedacted:true}};
 fs.writeFileSync(__dirname+'/execution-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
