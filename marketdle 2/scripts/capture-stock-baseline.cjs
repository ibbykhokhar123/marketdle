require('../tests/register-typescript.cjs')
const fs = require('node:fs')
const path = require('node:path')
const {createHash} = require('node:crypto')
const {COMPANIES} = require('../lib/server/companies.ts')
const {wordleAnswer, evaluateWordle} = require('../lib/server/wordle.ts')
const {chartAnswer, evaluateChart} = require('../lib/server/chart.ts')
const {rankingPuzzle, scoreRanking} = require('../lib/server/ranking.ts')
const {hlRound, hlAnswer} = require('../lib/server/hl.ts')
const {triviaQuestions} = require('../lib/server/trivia.ts')
const {addDays} = require('../lib/date.ts')
const target=path.join(__dirname,'../data/stock-expansion/legacy-puzzles.json')
if(fs.existsSync(target)) throw new Error('Refusing to overwrite captured baseline')
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const fixtures=[]
for(let date='2026-06-01';date<='2026-10-20';date=addDays(date,1)){
 const key={kind:'daily',date}
 const wordle=wordleAnswer(key),chart=chartAnswer(key),ranking=rankingPuzzle(key)
 const guesses=COMPANIES.slice(0,6).map(c=>c.ticker)
 fixtures.push({date,wordle:wordle.ticker,chart:chart.ticker,ranking:ranking.map(c=>c.ticker),
  wordleResponse:digest(evaluateWordle(key,guesses)),chartResponse:digest(evaluateChart(key,guesses.slice(0,5))),
  rankingResponse:digest(scoreRanking(key,ranking.map(c=>c.ticker))),
  higherLower:Array.from({length:10},(_,i)=>({round:hlRound(`hl:daily:${date}`,i,'standard'),answer:hlAnswer(`hl:daily:${date}`,i,'standard','higher')})),
  trivia:digest(triviaQuestions(key))})
}
fs.writeFileSync(target,JSON.stringify({originalCompanies:COMPANIES,fixtures},null,2)+'\n')
console.log(`Captured ${COMPANIES.length} original records and ${fixtures.length} unchanged daily puzzle baselines.`)
