import 'server-only'
import { seeded } from '@/lib/rng'
import type { ChartRange, PricePoint } from '@/lib/types'
import type { Company } from './companies'
import { verifiedHistory } from './verified-history'

const START = Date.UTC(2020, 6, 1)
const END = Date.UTC(2025, 5, 30)

function tradingDays(): string[] {
  const days: string[] = []
  for (let t = START; t <= END; t += 86_400_000) {
    const dow = new Date(t).getUTCDay()
    if (dow !== 0 && dow !== 6) days.push(new Date(t).toISOString().slice(0, 10))
  }
  return days
}

const DAYS = tradingDays()
const cache = new Map<string, PricePoint[]>()

/**
 * Builds an illustrative daily series that passes exactly through the company's
 * approximate semiannual anchor prices, with seeded Brownian-bridge noise in between.
 */
export function dailySeries(company: Company): PricePoint[] {
  const cacheKey = `${company.ticker}:${company.verifiedHistoryKey ? 'verified' : 'legacy'}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  if (company.verifiedHistoryKey) {
    const actual = verifiedHistory(company.verifiedHistoryKey)
    cache.set(cacheKey, actual)
    return actual
  }
  const logs = company.anchors.map(Math.log)
  const diffs = logs.slice(1).map((v, i) => v - logs[i])
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length
  const std = Math.sqrt(diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length)
  const sigma = Math.min(0.035, Math.max(0.009, (std / Math.sqrt(126)) * 1.3))

  const rand = seeded(`series:${company.ticker}`)
  const gauss = () => {
    const u = Math.max(rand(), 1e-9)
    const v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  const segments = company.anchors.length - 1
  const perSegment = (DAYS.length - 1) / segments
  const points: PricePoint[] = []

  for (let s = 0; s < segments; s++) {
    const startIdx = Math.round(s * perSegment)
    const endIdx = Math.round((s + 1) * perSegment)
    const n = endIdx - startIdx
    const walk = [0]
    for (let i = 1; i <= n; i++) walk.push(walk[i - 1] + gauss() * sigma)
    const drift = walk[n]
    for (let i = s === 0 ? 0 : 1; i <= n; i++) {
      const frac = i / n
      const bridge = walk[i] - drift * frac
      const logPrice = logs[s] + (logs[s + 1] - logs[s]) * frac + bridge
      points.push({ date: DAYS[startIdx + i], close: Math.round(Math.exp(logPrice) * 100) / 100 })
    }
  }

  cache.set(cacheKey, points)
  return points
}

export function seriesForRange(company: Company, range: ChartRange): PricePoint[] {
  const all = dailySeries(company)
  switch (range) {
    case '1M':
      return all.slice(-22)
    case '6M':
      return all.slice(-130)
    case '1Y':
      return all.slice(-261)
    case '5Y':
      return all.filter((_, i) => i % 5 === 0 || i === all.length - 1)
  }
}
