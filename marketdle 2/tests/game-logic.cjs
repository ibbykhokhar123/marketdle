// Compile the actual TypeScript modules in memory; never copy game rules into tests.
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const assert = require('node:assert/strict')
const {test, beforeEach} = require('node:test')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return originalResolve.call(this, request, ...args)
}
const cookieData = new Map()
const originalLoad = Module._load
Module._load = function(request, ...args) {
  if (request === 'server-only') return {}
  if (request === 'next/headers') return { cookies: async () => ({ get: key => cookieData.has(key) ? {value:cookieData.get(key)} : undefined, set: (key,value) => cookieData.set(key,value) }) }
  return originalLoad.call(this, request, ...args)
}
require.extensions['.ts'] = (module, filename) => {
  const {outputText} = ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}})
  module._compile(outputText,filename)
}
const dates = require('../lib/date.ts')
const {COMPANIES, CURRENT_COMPANIES} = require('../lib/server/companies.ts')
const {wordleAnswer, evaluateWordle} = require('../lib/server/wordle.ts')
const {chartAnswer, evaluateChart} = require('../lib/server/chart.ts')
const {hlRound, hlAnswer} = require('../lib/server/hl.ts')
const {rankingPuzzle, scoreRanking} = require('../lib/server/ranking.ts')
const {triviaQuestions, answerTrivia} = require('../lib/server/trivia.ts')
const {computeStats} = require('../lib/stats.ts')
const {dailyAttempt} = require('../lib/server/daily-attempt.ts')
const key = {kind:'daily',date:dates.etDate()}
beforeEach(()=>cookieData.clear())
test('Eastern calendar handles midnight and both DST transitions',()=>{
 assert.equal(dates.etDate(new Date('2026-10-21T03:59:59Z')),'2026-10-20')
 assert.equal(dates.etDate(new Date('2026-10-21T04:00:00Z')),'2026-10-21')
 assert.equal(dates.msUntilNextReset(new Date('2026-03-08T05:00:00Z')),23*3600000)
 assert.equal(dates.msUntilNextReset(new Date('2026-11-01T04:00:00Z')),25*3600000)
 assert.equal(dates.msUntilNextReset(new Date('2026-10-21T03:59:59Z')),1000)
})
test('Daily puzzles stay deterministic and anonymous while active',()=>{
 assert.equal(wordleAnswer(key).ticker,wordleAnswer(key).ticker)
 assert.equal(evaluateWordle(key,[]).reveal,null)
 assert.equal(evaluateChart(key,[]).reveal,null)
 assert.notEqual(wordleAnswer(key).ticker,chartAnswer(key).ticker)
 assert.deepEqual(hlRound('daily:test',0,'standard'),hlRound('daily:test',0,'standard'))
 assert.deepEqual(rankingPuzzle(key),rankingPuzzle(key))
 assert.deepEqual(triviaQuestions(key),triviaQuestions(key))
})
test('Wordle wins only for the mystery company and unlocks progressive hints',()=>{
 const answer=wordleAnswer(key)
 const wrong=COMPANIES.filter(c=>c.ticker!==answer.ticker).slice(0,6).map(c=>c.ticker)
 const first=evaluateWordle(key,[wrong[0]])
 assert.equal(first.status,'playing');assert.equal(first.hints.length,1)
 const win=evaluateWordle(key,[wrong[0],answer.ticker])
 assert.equal(win.status,'won');assert.equal(win.reveal.ticker,answer.ticker)
 assert.ok(win.rows[1].cells.every(c=>c.status==='correct'))
 const loss=evaluateWordle(key,wrong);assert.equal(loss.status,'lost');assert.equal(loss.reveal.ticker,answer.ticker)
 assert.ok(evaluateWordle(key,[wrong[0],wrong[0]]).error)
 assert.ok(evaluateWordle(key,['INVALID']).error)
 assert.ok(evaluateWordle(key,Array(7).fill('AAPL')).error)
})
test('Numeric clues point toward the mystery value',()=>{
 const answer=wordleAnswer(key)
 const other=COMPANIES.find(c=>c.ticker!==answer.ticker && Math.abs(c.marketCap-answer.marketCap)/answer.marketCap>.03)
 const cell=evaluateWordle(key,[other.ticker]).rows[0].cells.find(c=>c.key==='marketCap')
 assert.equal(cell.direction,answer.marketCap>other.marketCap?'up':'down')
})
test('Chart has five attempts, a hidden reveal, and unlockable ranges',()=>{
 const answer=chartAnswer(key)
 const wrong=COMPANIES.filter(c=>c.ticker!==answer.ticker).slice(0,5).map(c=>c.ticker)
 assert.ok(evaluateChart(key,[]).lockedRanges.includes('5Y'))
 assert.ok(evaluateChart(key,wrong.slice(0,2)).ranges['5Y'])
 assert.equal(evaluateChart(key,wrong).status,'lost')
 assert.equal(evaluateChart(key,[answer.ticker]).status,'won')
 assert.ok(evaluateChart(key,[wrong[0],wrong[0]]).error)
})
test('Higher/lower uses valid unequal metrics at every difficulty',()=>{
 for(const d of ['beginner','standard','expert'])for(let i=0;i<60;i++){
   const round=hlRound('integration',i,d)
   // Practice reads the current snapshot; legacy daily values remain frozen separately.
   const a=CURRENT_COMPANIES.find(c=>c.ticker===round.left.ticker)[round.metric.key]
   const b=CURRENT_COMPANIES.find(c=>c.ticker===round.right.ticker)[round.metric.key]
   assert.equal(typeof a,'number');assert.equal(typeof b,'number');assert.notEqual(a,b)
   assert.equal(hlAnswer('integration',i,d,b>a?'higher':'lower').correct,true)
   assert.equal(hlAnswer('integration',i,d,b>a?'lower':'higher').correct,false)
   assert.equal(round.right.display,undefined)
 }
})
test('Ranking scores actual positions and rejects duplicates',()=>{
 const companies=rankingPuzzle(key)
 const sorted=[...companies].sort((a,b)=>COMPANIES.find(c=>c.ticker===a.ticker).marketCap-COMPANIES.find(c=>c.ticker===b.ticker).marketCap).map(c=>c.ticker)
 assert.equal(scoreRanking(key,sorted).points,600)
 assert.equal(scoreRanking(key,sorted).correctCount,5)
 assert.ok(scoreRanking(key,Array(5).fill(sorted[0])).error)
})
test('Trivia hides answer keys until choice validation and explains results',()=>{
 const questions=triviaQuestions(key)
 assert.equal(questions.length,5)
 for(const q of questions){assert.equal(q.answerIndex,undefined);let correct=0;for(let i=0;i<q.options.length;i++){const a=answerTrivia(key,q.id,i);assert.ok(a.explanation);if(a.correct)correct++}assert.equal(correct,1)}
 assert.ok(answerTrivia(key,'bad-id',0).error)
 assert.ok(answerTrivia(key,questions[0].id,999).error)
})
test('Stats count completed daily games, wins, points, streaks, and perfect days',()=>{
 const records={};for(const date of [dates.addDays(key.date,-1),key.date])for(const mode of ['wordle','hl','chart','ranking','trivia'])records[mode+date]={mode,date,status:'won',points:100,guesses:mode==='wordle'?['AAPL','MSFT']:undefined}
 records.unfinished={mode:'wordle',date:dates.addDays(key.date,-2),status:'playing',points:0}
 const s=computeStats({records},key.date)
 assert.equal(s.played,10);assert.equal(s.totalPoints,1000);assert.equal(s.perfectDays,2);assert.equal(s.currentStreak,2);assert.equal(s.winRate,100);assert.equal(s.averageGuesses,2)
})
test('Signed daily sequence rejects rewinds, skipped guesses, and post-result changes',async()=>{
 assert.equal(await dailyAttempt('wordle',key.date,[],false),null)
 assert.equal(await dailyAttempt('wordle',key.date,['AAPL'],false),null)
 assert.ok(await dailyAttempt('wordle',key.date,['MSFT'],false))
 assert.ok(await dailyAttempt('wordle',key.date,['AAPL','MSFT','NVDA'],false))
 assert.equal(await dailyAttempt('wordle',key.date,['AAPL','MSFT'],true),null)
 assert.equal(await dailyAttempt('wordle',key.date,['AAPL','MSFT'],true),null)
 assert.ok(await dailyAttempt('wordle',key.date,['AAPL','MSFT','NVDA'],true))
})
test('Daily API rejects answer fishing, duplicate guesses, bad input, and future dates',async()=>{
 const route=require('../app/api/wordle/route.ts')
 const post=body=>route.POST(new Request('http://localhost/api/wordle',{method:'POST',body:JSON.stringify(body)}))
 const base={mode:'daily',date:key.date}
 assert.equal((await post({...base,guesses:[]})).status,200)
 assert.equal((await post({...base,guesses:['AAPL','MSFT','NVDA','TSLA','AMZN','META']})).status,400)
 assert.equal((await post({...base,guesses:['AAPL',15]})).status,400)
 assert.equal((await post({...base,date:dates.addDays(key.date,1),guesses:[]})).status,400)
 assert.equal((await post('bad')).status,400)
 const valid=await post({...base,guesses:[wordleAnswer(key).ticker]});assert.equal(valid.status,200);assert.equal((await valid.json()).status,'won')
 assert.equal((await post({...base,guesses:['TSLA']})).status,400)
})
test('Daily trivia cannot change a submitted choice',async()=>{
 const {POST}=require('../app/api/trivia/route.ts');const q=triviaQuestions(key)[0]
 const post=choice=>POST(new Request('http://localhost/api/trivia',{method:'POST',body:JSON.stringify({mode:'daily',date:key.date,id:q.id,choice})}))
 assert.equal((await post(0)).status,200);assert.equal((await post(0)).status,200);assert.equal((await post(1)).status,400)
})
test('Daily higher/lower cannot skip a round or reverse a choice',async()=>{
 const {POST}=require('../app/api/hl/route.ts')
 const post=(index,choice)=>POST(new Request('http://localhost/api/hl',{method:'POST',body:JSON.stringify({mode:'daily',date:key.date,index,choice})}))
 assert.equal((await post(2,'higher')).status,400)
 assert.equal((await post(0,'higher')).status,200)
 assert.equal((await post(0,'lower')).status,400)
 assert.equal((await post(0,'higher')).status,200)
})

test('Yesterday cannot overwrite a completed attempt for today',async()=>{
 assert.equal(await dailyAttempt('wordle',key.date,['AAPL'],true),null)
 assert.equal(await dailyAttempt('wordle',dates.addDays(key.date,-1),[],false),null)
 assert.ok(await dailyAttempt('wordle',key.date,['MSFT'],true))
})
