const assert = require('node:assert/strict')
const { beforeMobile } = require('./mobile-preservation.cjs')
const replacements = require('../data/branding/replacements.json')
// Reverse only the explicitly recorded branding edits; existing preservation hashes stay immutable.
function beforeBranding(file, source) {
  source = beforeMobile(file, source)
  for (const [before, after] of [...(replacements[file] || [])].reverse()) {
    assert.ok(source.includes(after), `Missing approved branding text in ${file}`)
    source = source.split(after).join(before)
  }
  return source
}
module.exports = { beforeBranding }
