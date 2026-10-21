require('./register-typescript.cjs')
const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {createHash} = require('node:crypto')
const root=path.resolve(__dirname,'..')
const baseline=require('../data/stock-expansion/baseline.json')
const { beforeBranding } = require('./branding-preservation.cjs')
const legacy=require('../data/stock-expansion/legacy-puzzles.json')
const coverage=require('../data/stock-expansion/coverage-summary.json')
const selection=require('../data/stock-expansion/selection.json')
const audit=require('../data/stock-expansion/company-verification.json')
const {COMPANIES,CURRENT_COMPANIES,LEGACY_COMPANIES,getCompany,canonicalTicker}=require('../lib/server/companies.ts')
const {wordleAnswer,evaluateWordle,compare}=require('../lib/server/wordle.ts')
const {chartAnswer,evaluateChart}=require('../lib/server/chart.ts')
const {rankingPuzzle,scoreRanking}=require('../lib/server/ranking.ts')
const {hlRound,hlAnswer}=require('../lib/server/hl.ts')
const {triviaQuestions}=require('../lib/server/trivia.ts')
const {seriesForRange}=require('../lib/server/series.ts')
const {hasVerifiedHistory}=require('../lib/server/verified-history.ts')
const {universe}=require('../lib/server/common.ts')
const {companiesForPuzzle,EXPANDED_DAILY_START}=require('../lib/server/stock-pools.ts')
const {rank}=require('../components/game/stock-search.tsx')
const fmt=require('../lib/format.ts')
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex')
const additions=COMPANIES.filter(c=>!baseline.originalTickers.includes(c.ticker))

test('All 48 original companies are preserved exactly and remain in their original order',()=>{
 assert.equal(baseline.originalStockCount,48)
 assert.deepEqual(LEGACY_COMPANIES,legacy.originalCompanies)
 assert.deepEqual(COMPANIES.slice(0,48),legacy.originalCompanies)
 for(const c of legacy.originalCompanies)assert.deepEqual(getCompany(c.ticker),c)
 assert.equal(COMPANIES.length,coverage.newCount)
 assert.ok(COMPANIES.length>=500)
 assert.equal(COMPANIES.length,new Set(COMPANIES.map(c=>c.ticker)).size)
})
test('Every Nasdaq-screened issuer over $100B is covered, with share classes canonicalized',()=>{
 const all=new Set(COMPANIES.map(c=>c.ticker))
 for(const ticker of selection.over100B)assert.ok(all.has(canonicalTicker(ticker)),ticker)
 assert.equal(coverage.missingOver100B.length,0)
 assert.equal(coverage.over100BCount,163)
 assert.equal(getCompany('GOOG').ticker,'GOOGL')
 assert.equal(getCompany('BRK-A').ticker,'BRK.B')
 assert.equal(getCompany('BRK/B').ticker,'BRK.B')
 assert.equal(getCompany('BBDO').ticker,'BBD')
 assert.ok(!all.has('GOOGM')&&!all.has('CCZ')&&!all.has('TBB'))
 for(const t of ['PLTR','MU','NVDA','AAPL','MSFT','GOOGL','AMZN','META','AVGO','TSLA','AMD'])assert.ok(all.has(t),t)
})
test('All 142 existing daily puzzles retain exact answers, rounds, feedback, scoring, and trivia',()=>{
 for(const fixture of legacy.fixtures){
  const key={kind:'daily',date:fixture.date}
  assert.equal(wordleAnswer(key).ticker,fixture.wordle,fixture.date)
  assert.equal(chartAnswer(key).ticker,fixture.chart,fixture.date)
  const order=rankingPuzzle(key).map(c=>c.ticker)
  assert.deepEqual(order,fixture.ranking)
  assert.equal(digest(evaluateWordle(key,LEGACY_COMPANIES.slice(0,6).map(c=>c.ticker))),fixture.wordleResponse)
  assert.equal(digest(evaluateChart(key,LEGACY_COMPANIES.slice(0,5).map(c=>c.ticker))),fixture.chartResponse)
  assert.equal(digest(scoreRanking(key,order)),fixture.rankingResponse)
  fixture.higherLower.forEach((r,i)=>{assert.deepEqual(hlRound(`hl:daily:${fixture.date}`,i,'standard'),r.round);assert.deepEqual(hlAnswer(`hl:daily:${fixture.date}`,i,'standard','higher'),r.answer)})
  assert.equal(digest(triviaQuestions(key)),fixture.trivia)
 }
})
test('Expansion starts at the next daily reset; practice uses the expanded snapshot immediately',()=>{
 assert.equal(EXPANDED_DAILY_START,'2026-10-21')
 assert.equal(companiesForPuzzle({kind:'daily',date:'2026-10-20'}).length,48)
 assert.equal(companiesForPuzzle({kind:'daily',date:'2026-10-21'}).length,COMPANIES.length)
 assert.equal(companiesForPuzzle({kind:'practice',seed:'regression'}).length,COMPANIES.length)
})
test('PLTR, MU, and every addition are valid guesses on both existing daily and new practice puzzles',()=>{
 for(const c of additions){
  for(const key of [{kind:'daily',date:'2026-10-20'},{kind:'practice',seed:'new-universe-check'}]){
   const w=evaluateWordle(key,[c.ticker]);const chart=evaluateChart(key,[c.ticker])
   assert.ok(!w.error,`${c.ticker}: ${w.error}`);assert.ok(!chart.error,c.ticker)
   assert.equal(w.rows[0].ticker,c.ticker);assert.equal(chart.guesses[0].ticker,c.ticker)
  }
 }
 for(const t of ['PLTR','MU']){
  const company=getCompany(t);assert.equal(company.exchange,'NASDAQ');assert.ok(company.marketCap>100)
  assert.ok(typeof company.ipoYear==='number');assert.ok(hasVerifiedHistory(t))
 }
})
test('Expanded Wordle daily cycle reaches every company without altering its selection algorithm',()=>{
 const seen=new Set()
 for(let i=0;i<COMPANIES.length;i++){
  const date=new Date(Date.parse(`${EXPANDED_DAILY_START}T00:00:00Z`)+i*86400000).toISOString().slice(0,10)
  seen.add(wordleAnswer({kind:'daily',date}).ticker)
 }
 assert.deepEqual([...seen].sort(),COMPANIES.map(c=>c.ticker).sort())
})
test('Chart, ranking, and higher/lower actually select added and original stocks',()=>{
 const seen={chart:new Set(),ranking:new Set(),hl:new Set()}
 const byTicker=new Map(CURRENT_COMPANIES.map(c=>[c.ticker,c]))
 for(let i=0;i<1400;i++){
  const key={kind:'practice',seed:`expanded-${i}`}
  const chart=chartAnswer(key);seen.chart.add(chart.ticker)
  assert.ok(seriesForRange(chart,'1M').length>0)
  for(const c of rankingPuzzle(key))seen.ranking.add(c.ticker)
  for(const difficulty of ['beginner','standard','expert']){
   const seed=`hl:endless:expanded-${i}`;const round=hlRound(seed,i%10,difficulty)
   const a=byTicker.get(round.left.ticker)[round.metric.key],b=byTicker.get(round.right.ticker)[round.metric.key]
   assert.equal(typeof a,'number');assert.equal(typeof b,'number');assert.notEqual(a,b)
   assert.ok(Number.isFinite(a)&&Number.isFinite(b))
   assert.equal(hlAnswer(seed,i%10,difficulty,b>a?'higher':'lower').correct,true)
   seen.hl.add(round.left.ticker);seen.hl.add(round.right.ticker)
  }
 }
 for(const mode of Object.keys(seen)){
  assert.ok([...seen[mode]].some(t=>baseline.originalTickers.includes(t)),mode)
  assert.ok([...seen[mode]].some(t=>additions.some(c=>c.ticker===t)),mode)
  assert.ok(seen[mode].has('PLTR'),mode+' PLTR');assert.ok(seen[mode].has('MU'),mode+' MU')
  assert.ok(seen[mode].size>COMPANIES.length*.75,mode)
 }
})
test('Every listing matches the primary directory; issuer aliases never duplicate answer entries',()=>{
 const directory=fs.readFileSync(path.join(root,'data/stock-expansion/nasdaqtraded.txt'),'utf8').split(/\r?\n/)
 const stocks=new Map(directory.slice(1).map(row=>{const fields=row.split('|');return [fields[1],fields]}))
 const seenNames=new Set()
 for(const c of additions){
  const line=stocks.get(c.ticker);assert.ok(line,c.ticker);assert.equal(line[5],'N');assert.equal(line[7],'N')
  assert.ok(audit.some(a=>a.ticker===c.ticker))
  const normalized=c.name.toLowerCase().replace(/[^a-z0-9]/g,'');assert.ok(!seenNames.has(normalized),c.name);seenNames.add(normalized)
 }
})
test('Historical additions contain only actual positive dated source closes, with safe range handling',()=>{
 const raw=require('../data/stock-expansion/expanded-histories.json')
 for(const c of additions){
  const actual=raw[c.ticker]??[]
  assert.ok(c.anchors.length===0,'No synthetic anchor prices for '+c.ticker)
  const dates=new Set()
  for(const [d,v] of actual){assert.match(d,/^\d{4}-\d{2}-\d{2}$/);assert.ok(v>0&&Number.isFinite(v));assert.ok(!dates.has(d));dates.add(d)}
  assert.deepEqual(actual.map(p=>p[0]),actual.map(p=>p[0]).sort())
  for(const range of ['1M','6M','1Y','5Y'])for(const point of seriesForRange(c,range))assert.equal(actual.find(p=>p[0]===point.date)[1],point.close)
 }
 // Warm the verified cache for an original ticker; its old demo chart must remain identical.
 seriesForRange(CURRENT_COMPANIES.find(c=>c.ticker==='AAPL'),'5Y')
 const first=legacy.fixtures[0]
 assert.equal(digest(evaluateChart({kind:'daily',date:first.date},LEGACY_COMPANIES.slice(0,5).map(c=>c.ticker))),first.chartResponse)
})
test('Missing metrics are explicit and excluded from comparisons; formatting never invents zeros',()=>{
 for(const format of Object.values(fmt))assert.equal(format(null),'N/A')
 assert.ok(!/Imperial Oil/i.test(getCompany('IMO').blurb),'New business-description hints must hide the company name')
 assert.ok(!/Palantir/i.test(getCompany('PLTR').blurb))
 assert.ok(!/Micron/i.test(getCompany('MU').blurb))
 for(const c of additions){
  assert.equal(c.employees,null);assert.equal(c.revenueGrowth,null)
  assert.ok(c.founded==='N/A'||typeof c.founded==='number')
  assert.ok(c.sourceNote.includes('Missing fields are unavailable'))
  for(const key of ['price','pe','revenue','netIncome'])assert.ok(c[key]===null||Number.isFinite(c[key]))
 }
 const row=compare(getCompany('PLTR'),LEGACY_COMPANIES[0])
 for(const cell of row.cells.filter(c=>['marketCap','price','pe'].includes(c.key))){assert.equal(cell.direction,null);assert.equal(cell.directionLabel,'Different snapshot dates')}
})
test('All ticker/name searches still work, including PLTR, MU, and share-class spellings',()=>{
 const list=universe()
 assert.equal(list.length,COMPANIES.length)
 for(const c of list){assert.equal(rank(c,c.ticker.toLowerCase()),0);assert.ok(rank(c,c.name.toLowerCase())>=0)}
 assert.equal(rank(list.find(c=>c.ticker==='BRK.B'),'brk-b'),0)
 assert.equal(rank(list.find(c=>c.ticker==='GOOGL'),'goog'),0)
 for(const t of ['PLTR','MU'])assert.equal(rank(list.find(c=>c.ticker===t),t.toLowerCase()),0)
})
test('Only recorded branding/mobile presentation edits are allowed; routes, scoring, storage and statistics remain intact',()=>{
 for(const [file,hash] of Object.entries(baseline.sourceHashes)){
  if((file.startsWith('components/')&&file!=='components/game/stock-search.tsx')||file.startsWith('app/')||file.startsWith('lib/client/')||['lib/stats.ts','lib/date.ts','lib/rng.ts'].includes(file))assert.equal(digest(beforeBranding(file,fs.readFileSync(path.join(root,file),'utf8'))),hash,file)
 }
 const original=fs.readFileSync(path.join(root,'data/stock-expansion/original-stock-search.tsx.txt'),'utf8')
 const current=beforeBranding('components/game/stock-search.tsx',fs.readFileSync(path.join(root,'components/game/stock-search.tsx'),'utf8'))
 assert.equal(current.slice(current.indexOf('export function StockSearch(')),original.slice(original.indexOf('export function StockSearch(')))
})
