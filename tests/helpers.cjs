const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function loader(mocks = {}, env = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, {
      exports, process: { env }, URL, Date, console, File, FormData, Blob,
      require(name) {
        if (name in mocks) return mocks[name];
        if (name === "server-only") return {};
        if (name === "next/cache") return { unstable_noStore() {} };
        if (name.startsWith("@/")) { const base = `src/${name.slice(2)}`; return load(fs.existsSync(path.resolve(root, `${base}.ts`)) ? `${base}.ts` : `${base}.tsx`); }
        return require(name);
      },
    }, { filename: absolute });
    return exports;
  }
  return load;
}

module.exports = { loader };
