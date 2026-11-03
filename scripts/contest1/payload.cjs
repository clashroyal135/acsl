// Emit a bounded JSON chunk for transactional database import; contains no credentials.
const { loader } = require('../../tests/helpers.cjs');
const { bundledAdminProblems, problemToRow } = loader()('src/lib/admin-problems.server.ts');
const start=Number(process.argv[2]||0), count=Number(process.argv[3]||3);
const problems=bundledAdminProblems().slice(start,start+count);
process.stdout.write(JSON.stringify(problems.map(problem=>({problem:problemToRow({...problem,isPublished:false}),tests:problem.tests}))));
