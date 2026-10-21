const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return originalResolve.call(this, request, ...args)
}
const originalLoad = Module._load
Module._load = function (request, ...args) {
  if (request === 'server-only') return {}
  return originalLoad.call(this, request, ...args)
}
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true, jsx: ts.JsxEmit.ReactJSX },
  })
  module._compile(outputText, filename)
}

require.extensions['.tsx'] = require.extensions['.ts']
