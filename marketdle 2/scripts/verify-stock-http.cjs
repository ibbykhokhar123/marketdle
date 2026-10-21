require('../tests/register-typescript.cjs')
const assert=require('node:assert/strict')
const {rankingPuzzle}=require('../lib/server/ranking.ts')
const {triviaQuestions}=require('../lib/server/trivia.ts')
const origin=process.env.BELLWETHER_URL||'http://127.0.0.1:3000'
const seed='stock-expansion-http'
async function post(route,body){
 const response=await fetch(`${origin}/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
 const result=await response.json();assert.equal(response.status,200,`${route}: ${JSON.stringify(result)}`);return result
}
;(async()=>{
 for(const route of ['/','/play/wordle','/play/higher-lower','/play/chart','/play/ranking','/play/trivia','/stats','/leaderboard','/about']){
  const response=await fetch(origin+route);assert.equal(response.status,200,route)
  const html=await response.text()
  const title=html.match(/<title>(.*?)<\/title>/)?.[1]
  assert.ok(title==='Marketdle'||title?.endsWith(' · Marketdle'),`${route}: ${title}`)
  assert.ok(html.includes('content="Marketdle"'),`${route}: application identity`)
  assert.ok(!html.includes('Bellwether'),`${route}: old visible brand`)
  if(route==='/') {
   assert.ok(html.includes('Marketdle is a daily stock market guessing game where players test their financial knowledge through stock puzzles, market cap comparisons, and interactive challenges.'))
   assert.ok(html.includes('property="og:site_name" content="Marketdle"'))
   assert.ok(html.includes('name="twitter:title" content="Marketdle — Guess the Stock. Beat the Market."'))
  }
  if(route==='/play/wordle'){assert.ok(html.includes('PLTR'));assert.ok(html.includes('Micron'))}
 }
 for(const ticker of ['PLTR','MU','AAPL','MSFT']){
  const w=await post('wordle',{mode:'practice',seed,guesses:[ticker]});assert.equal(w.rows[0].ticker,ticker)
  const c=await post('chart',{mode:'practice',seed,guesses:[ticker]});assert.equal(c.guesses[0].ticker,ticker)
 }
 for(const difficulty of ['beginner','standard','expert']){
  const result=await post('hl',{mode:'practice',seed,difficulty,index:0,choice:'higher'});assert.equal(typeof result.answer.correct,'boolean');assert.ok(result.round.asOf)
 }
 const key={kind:'practice',seed};const order=rankingPuzzle(key).map(c=>c.ticker)
 const rank=await post('ranking',{mode:'practice',seed,order});assert.equal(rank.results.length,5)
 const question=triviaQuestions(key)[0];const trivia=await post('trivia',{mode:'practice',seed,id:question.id,choice:0});assert.ok(trivia.explanation)
 console.log('HTTP checks passed: 9 pages with Marketdle titles/metadata, Wordle/Chart with PLTR, MU and original stocks, all higher/lower difficulties, ranking, trivia. No daily attempts or player storage were changed.')
})().catch(error=>{console.error(error);process.exitCode=1})
