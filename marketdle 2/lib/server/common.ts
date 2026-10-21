import 'server-only'
import { etDate, isValidDateString, addDays } from '@/lib/date'
import type { CompanyReveal, UniverseEntry } from '@/lib/types'
import { COMPANIES, CURRENT_COMPANIES, TICKER_ALIASES, type Company } from './companies'
import { seriesForRange } from './series'

export function universe(): UniverseEntry[] {
  return CURRENT_COMPANIES.map(({ ticker, name, exchange }) => ({ ticker, name, exchange, ...(Object.entries(TICKER_ALIASES).some(([, canonical]) => canonical === ticker) ? { aliases: Object.entries(TICKER_ALIASES).filter(([, canonical]) => canonical === ticker).map(([alias]) => alias) } : {}) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
}

/**
 * Accepts today's puzzle (and yesterday's, so a game started right before the
 * midnight ET reset can still be finished) but never future puzzles.
 */
export function resolveDailyDate(input: unknown): string | null {
  const today = etDate()
  if (!isValidDateString(input)) return null
  if (input === today || input === addDays(today, -1)) return input
  return null
}

export type PuzzleKey = { kind: 'daily'; date: string } | { kind: 'practice'; seed: string }

export function parsePuzzleKey(body: { mode?: unknown; date?: unknown; seed?: unknown }): PuzzleKey | null {
  if (body.mode === 'practice') {
    if (typeof body.seed !== 'string' || !/^[a-z0-9-]{4,40}$/i.test(body.seed)) return null
    return { kind: 'practice', seed: body.seed }
  }
  if (body.mode !== 'daily') return null
  const date = resolveDailyDate(body.date)
  return date ? { kind: 'daily', date } : null
}

export function keyString(game: string, key: PuzzleKey): string {
  return key.kind === 'daily' ? `${game}:daily:${key.date}` : `${game}:practice:${key.seed}`
}

export function toReveal(c: Company): CompanyReveal {
  return {
    ticker: c.ticker,
    name: c.name,
    exchange: c.exchange,
    sector: c.sector,
    industry: c.industry,
    country: c.country,
    hq: c.hq,
    ipoYear: c.ipoYear,
    founded: c.founded,
    description: c.blurb,
    howItMakesMoney: c.howItMakesMoney,
    products: c.products,
    fact: c.fact,
    history: c.sourceNote ? `${c.history} ${c.sourceNote}` : c.history,
    metrics: {
      marketCap: c.marketCap,
      price: c.price,
      pe: c.pe,
      revenue: c.revenue,
      netIncome: c.netIncome,
      revenueGrowth: c.revenueGrowth,
      employees: c.employees,
    },
    series: seriesForRange(c, '5Y'),
  }
}

export function marketCapRange(cap: number): string {
  if (cap >= 2000) return 'Over $2 trillion'
  if (cap >= 1000) return '$1 trillion – $2 trillion'
  if (cap >= 500) return '$500 billion – $1 trillion'
  if (cap >= 200) return '$200 billion – $500 billion'
  if (cap >= 100) return '$100 billion – $200 billion'
  if (cap >= 50) return '$50 billion – $100 billion'
  return 'Under $50 billion'
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 })
}
