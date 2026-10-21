require('./register-typescript.cjs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { WordleBoard } = require('../components/wordle/wordle-board.tsx')
const { evaluateWordle } = require('../lib/server/wordle.ts')

test('Compact Wordle keeps every original attribute, value, status, direction and accessible feedback', () => {
  const response = evaluateWordle({ kind: 'practice', seed: 'mobile-regression' }, ['PLTR', 'MU', 'AAPL'])
  const html = renderToStaticMarkup(React.createElement(WordleBoard, {rows: response.rows, maxGuesses: 6, loading: false}))
  assert.equal((html.match(/role="rowheader"/g) || []).length, 3)
  assert.equal((html.match(/role="cell"/g) || []).length, 21)
  for (const row of response.rows) {
    assert.ok(html.includes(row.ticker))
    for (const cell of row.cells) {
      const escaped = cell.display.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
      assert.ok(html.includes(escaped), cell.display)
      assert.ok(html.includes(`aria-hidden="true">${cell.key === 'ipoYear' ? 'IPO year' : cell.label}</span>`), cell.label)
      assert.ok(html.includes(cell.directionLabel || (cell.status === 'correct' ? 'Match' : 'No match')))
    }
  }
})

test('Loading and empty Wordle states retain all eight placeholder cells per remaining guess', () => {
  for (const loading of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(WordleBoard, {rows: [], maxGuesses: 6, loading}))
    assert.equal((html.match(/wordle-empty/g) || []).length, 6)
    assert.equal((html.match(/border-dashed/g) || []).length, 48)
    assert.ok(html.includes(`aria-busy="${loading}"`))
  }
})

test('New CSS is confined to phone/tablet breakpoints, preserving desktop rules', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const postcss = require('postcss')
  const changes = require('../data/mobile/approved-ui-changes.json')
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8')
  const original = changes['app/globals.css'].before
  assert.ok(css.startsWith(original), 'Original theme and desktop styles remain byte-for-byte intact')
  const added = postcss.parse(css.slice(original.length))
  for (const node of added.nodes) {
    if (node.type === 'comment') continue
    assert.equal(node.type, 'atrule')
    assert.equal(node.name, 'media')
    assert.match(node.params, /^\(max-width: (1023|767)px\)$/)
  }
})
