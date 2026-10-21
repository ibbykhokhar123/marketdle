require('./register-typescript.cjs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { rebrandShareText } = require('../lib/branding.ts')
const { beforeBranding } = require('./branding-preservation.cjs')
const baseline = require('../data/branding/preservation-hashes.json')
const replacements = require('../data/branding/replacements.json')
const mobileChanges = require('../data/mobile/approved-ui-changes.json')
const root = path.resolve(__dirname, '..')

test('All existing source and stock data are preserved except recorded branding and mobile presentation edits', () => {
  for (const [file, hash] of Object.entries(baseline)) {
    const source = fs.readFileSync(path.join(root, file))
    const preserved = (replacements[file] || mobileChanges[file]) ? beforeBranding(file, source.toString('utf8')) : source
    assert.equal(createHash('sha256').update(preserved).digest('hex'), hash, file)
  }
})

test('Every game can share an older saved result under Marketdle without mutating saved progress', () => {
  for (const mode of ['Stock Wordle', 'Higher or Lower', 'Guess the Chart', 'Market Cap Ranking', 'Market Trivia']) {
    const saved = Object.freeze({ share: `Bellwether ${mode} #102 3/5\n🟩🟥🟩`, streak: 12 })
    assert.equal(rebrandShareText(saved.share), `Marketdle ${mode} #102 3/5\n🟩🟥🟩`)
    assert.ok(saved.share.startsWith('Bellwether'))
    assert.equal(saved.streak, 12)
  }
  assert.equal(rebrandShareText('BELLWETHER #1'), 'Marketdle #1')
  assert.equal(rebrandShareText('Marketdle Stock Wordle #1 4/6'), 'Marketdle Stock Wordle #1 4/6')
})

test('Metadata and wordmark consistently use the requested name and description', () => {
  const layout = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8')
  assert.ok(layout.includes("default: 'Marketdle'"))
  assert.ok(layout.includes("template: '%s · Marketdle'"))
  assert.ok(layout.includes("siteName: 'Marketdle'"))
  assert.ok(layout.includes("applicationName: 'Marketdle'"))
  assert.ok(layout.includes("card: 'summary'"))
  assert.equal((layout.match(/Marketdle is a daily stock market guessing game where players test their financial knowledge through stock puzzles, market cap comparisons, and interactive challenges\./g) || []).length, 3)
  assert.ok(fs.readFileSync(path.join(root, 'components/logo.tsx'), 'utf8').includes('>Marketdle</span>'))
  assert.ok(!layout.includes('Bellwether'))
})
