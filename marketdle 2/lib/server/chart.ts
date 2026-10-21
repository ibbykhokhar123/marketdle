import 'server-only'
import { seeded, shuffle } from '@/lib/rng'
import type { ChartGuess, ChartRange, ChartResponse } from '@/lib/types'
import { COMPANIES, getCompany, type Company } from './companies'
import { keyString, marketCapRange, toReveal, type PuzzleKey } from './common'
import { seriesForRange } from './series'
import { wordleAnswer } from './wordle'
import { companiesForPuzzle, companyForPuzzle, usesLegacyPool } from './stock-pools'
import { hasVerifiedHistory } from './verified-history'

export const CHART_MAX = 5

export function chartAnswer(key: PuzzleKey): Company {
  const candidates = companiesForPuzzle(key).filter(c => usesLegacyPool(key) || !c.verifiedHistoryKey || hasVerifiedHistory(c.ticker))
  const pool = shuffle(candidates, seeded('chart-pool-v1'))
  let idx: number
  if (key.kind === 'daily') {
    const day = Math.floor(Date.parse(`${key.date}T00:00:00Z`) / 86_400_000)
    idx = ((day % pool.length) + pool.length) % pool.length
  } else {
    idx = Math.floor(seeded(keyString('chart', key))() * pool.length)
  }
  const candidate = pool[idx]
  if (key.kind === 'daily' && candidate.ticker === wordleAnswer(key).ticker) {
    return pool[(idx + 1) % pool.length]
  }
  return candidate
}

export function evaluateChart(key: PuzzleKey, rawGuesses: string[]): ChartResponse | { error: string } {
  if (rawGuesses.length > CHART_MAX) return { error: 'Too many guesses' }
  const answer = chartAnswer(key)
  const guesses: ChartGuess[] = []
  const seen = new Set<string>()
  for (const raw of rawGuesses) {
    const c = companyForPuzzle(raw, key)
    if (!c) return { error: `Unknown ticker: ${raw}` }
    if (seen.has(c.ticker)) return { error: `Duplicate guess: ${c.ticker}` }
    seen.add(c.ticker)
    guesses.push({ ticker: c.ticker, name: c.name, correct: c.ticker === answer.ticker, sameSector: c.sector === answer.sector })
    if (c.ticker === answer.ticker) break
  }
  const won = guesses.some((g) => g.correct)
  const status = won ? 'won' : guesses.length >= CHART_MAX ? 'lost' : 'playing'
  const wrong = guesses.filter((g) => !g.correct).length
  const over = status !== 'playing'

  const allClues = [
    { title: 'Sector', body: answer.sector },
    { title: 'Listed on', body: `${answer.exchange} · headquartered in ${answer.country}` },
    { title: 'Market cap range', body: marketCapRange(answer.marketCap) },
    { title: 'What it does', body: answer.blurb },
  ]
  const clues = over ? allClues : allClues.slice(0, wrong)

  const unlocked: ChartRange[] = ['1M', '6M', '1Y']
  if (over || wrong >= 2) unlocked.push('5Y')
  const ranges: ChartResponse['ranges'] = {}
  for (const r of unlocked) ranges[r] = seriesForRange(answer, r)

  return {
    puzzleId: keyString('chart', key),
    status,
    maxGuesses: CHART_MAX,
    guesses,
    clues,
    ranges,
    lockedRanges: (['1M', '6M', '1Y', '5Y'] as ChartRange[]).filter((r) => !unlocked.includes(r)),
    reveal: over ? toReveal(answer) : null,
  }
}
