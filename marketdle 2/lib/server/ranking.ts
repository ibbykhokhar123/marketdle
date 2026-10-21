import 'server-only'
import { seeded, shuffle } from '@/lib/rng'
import { formatBillions } from '@/lib/format'
import type { RankingCompany, RankingResult } from '@/lib/types'
import { COMPANIES, DATA_AS_OF, comparisonDataDate, type Company } from './companies'
import { keyString, type PuzzleKey } from './common'
import { companiesForPuzzle } from './stock-pools'

export const RANKING_SIZE = 5

function pickCompanies(key: PuzzleKey): Company[] {
  const rand = seeded(keyString('ranking', key))
  const pool = shuffle(companiesForPuzzle(key), rand)
  const chosen: Company[] = []
  for (const c of pool) {
    const tooClose = chosen.some((x) => Math.max(x.marketCap, c.marketCap) / Math.min(x.marketCap, c.marketCap) < 1.15)
    if (!tooClose) chosen.push(c)
    if (chosen.length === RANKING_SIZE) break
  }
  return chosen
}

export function rankingPuzzle(key: PuzzleKey): RankingCompany[] {
  return pickCompanies(key).map(({ ticker, name, exchange, sector }) => ({ ticker, name, exchange, sector }))
}

export function scoreRanking(key: PuzzleKey, order: string[]): RankingResult | { error: string } {
  const companies = pickCompanies(key)
  const tickers = new Set(companies.map((c) => c.ticker))
  if (order.length !== RANKING_SIZE || new Set(order).size !== RANKING_SIZE || !order.every((t) => tickers.has(t))) {
    return { error: 'Order must contain each puzzle company exactly once' }
  }
  const correct = [...companies].sort((a, b) => a.marketCap - b.marketCap)
  const results = correct.map((c, correctIndex) => ({
    ticker: c.ticker,
    name: c.name,
    marketCapDisplay: formatBillions(c.marketCap),
    correctIndex,
    yourIndex: order.indexOf(c.ticker),
  }))
  const correctCount = results.filter((r) => r.correctIndex === r.yourIndex).length
  return { points: correctCount * 100 + (correctCount === RANKING_SIZE ? 100 : 0), correctCount, results, asOf: comparisonDataDate(companies) }
}
