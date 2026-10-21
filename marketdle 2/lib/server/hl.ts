import 'server-only'
import { seeded, pick } from '@/lib/rng'
import { formatBillions, formatCompact, formatPercent, formatPrice, formatRatio } from '@/lib/format'
import type { HlAnswer, HlDifficulty, HlMetricKey, HlRound } from '@/lib/types'
import { COMPANIES, DATA_AS_OF, comparisonDataDate, metricDataDate, type Company } from './companies'

import { companiesForSeed } from './stock-pools'

export const HL_DAILY_ROUNDS = 10

interface MetricDef {
  key: HlMetricKey
  label: string
  question: string
  unitNote: string
  format: (v: number) => string
  diff: (a: number, b: number) => string
  noun: string
}

const METRICS: Record<HlMetricKey, MetricDef> = {
  marketCap: {
    key: 'marketCap', label: 'Market Cap', noun: 'market capitalization',
    question: 'Is its market capitalization higher or lower?',
    unitNote: 'USD, total value of all shares', format: formatBillions,
    diff: (a, b) => formatBillions(Math.abs(a - b)),
  },
  price: {
    key: 'price', label: 'Share Price', noun: 'share price',
    question: 'Is its share price higher or lower?',
    unitNote: 'USD per share, split-adjusted close', format: formatPrice,
    diff: (a, b) => formatPrice(Math.abs(a - b)),
  },
  revenue: {
    key: 'revenue', label: 'Annual Revenue', noun: 'annual revenue',
    question: 'Is its annual revenue higher or lower?',
    unitNote: 'USD, trailing twelve months', format: formatBillions,
    diff: (a, b) => formatBillions(Math.abs(a - b)),
  },
  netIncome: {
    key: 'netIncome', label: 'Net Income', noun: 'net income',
    question: 'Is its net income (profit) higher or lower?',
    unitNote: 'USD, trailing twelve months', format: formatBillions,
    diff: (a, b) => formatBillions(Math.abs(a - b)),
  },
  pe: {
    key: 'pe', label: 'P/E Ratio', noun: 'price-to-earnings ratio',
    question: 'Is its P/E ratio higher or lower?',
    unitNote: 'Trailing price ÷ earnings per share', format: formatRatio,
    diff: (a, b) => formatRatio(Math.abs(a - b)),
  },
  revenueGrowth: {
    key: 'revenueGrowth', label: 'Revenue Growth', noun: 'revenue growth',
    question: 'Is its revenue growth higher or lower?',
    unitNote: 'Year-over-year, trailing twelve months', format: formatPercent,
    diff: (a, b) => `${Math.abs(a - b).toFixed(0)} pts`,
  },
  employees: {
    key: 'employees', label: 'Employees', noun: 'headcount',
    question: 'Does it have more or fewer employees?',
    unitNote: 'Full-time employees, latest annual report', format: (v) => formatCompact(v),
    diff: (a, b) => formatCompact(Math.abs(a - b)),
  },
}

const METRICS_BY_DIFFICULTY: Record<HlDifficulty, HlMetricKey[]> = {
  beginner: ['marketCap', 'price', 'revenue', 'employees'],
  standard: ['marketCap', 'price', 'revenue', 'netIncome', 'employees', 'pe'],
  expert: ['marketCap', 'price', 'revenue', 'netIncome', 'pe', 'revenueGrowth', 'employees'],
}

const MIN_RATIO: Record<HlDifficulty, number> = { beginner: 1.8, standard: 1.25, expert: 1.05 }

function value(c: Company, key: HlMetricKey): number | null {
  const v = c[key]
  return typeof v === 'number' ? v : null
}

function separation(a: number, b: number, key: HlMetricKey): number {
  if (key === 'revenueGrowth' || key === 'netIncome') return Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b)) + 1
  return Math.max(a, b) / Math.max(1e-9, Math.min(a, b))
}

function buildPair(seedKey: string, index: number, difficulty: HlDifficulty) {
  const rand = seeded(`${seedKey}:${difficulty}:${index}`)
  const metricKey = pick(METRICS_BY_DIFFICULTY[difficulty], rand)
  const candidates = companiesForSeed(seedKey).filter((c) => value(c, metricKey) !== null)
  for (let attempt = 0; attempt < 60; attempt++) {
    const left = pick(candidates, rand)
    const right = pick(candidates, rand)
    if (left.ticker === right.ticker) continue
    const a = value(left, metricKey)!
    const b = value(right, metricKey)!
    if (a === b) continue
    if (separation(a, b, metricKey) < MIN_RATIO[difficulty]) continue
    return { metric: METRICS[metricKey], left, right, a, b }
  }
  const [left, right] = candidates
  return { metric: METRICS[metricKey], left, right, a: value(left, metricKey)!, b: value(right, metricKey)! }
}

export function hlRound(seedKey: string, index: number, difficulty: HlDifficulty): HlRound {
  const { metric, left, right, a } = buildPair(seedKey, index, difficulty)
  return {
    index,
    metric: { key: metric.key, label: metric.label, question: metric.question, unitNote: metric.unitNote },
    left: { ticker: left.ticker, name: left.name, exchange: left.exchange, display: metric.format(a) },
    right: { ticker: right.ticker, name: right.name, exchange: right.exchange },
    asOf: [...new Set([metricDataDate(left, metric.key), metricDataDate(right, metric.key)])].join(' / ') + (left.financialPeriod && ['revenue', 'netIncome'].includes(metric.key) ? `; TTM through ${left.ticker}: ${left.financialPeriod}; ${right.ticker}: ${right.financialPeriod ?? 'unavailable'}` : ''),
  }
}

export function hlAnswer(seedKey: string, index: number, difficulty: HlDifficulty, choice: 'higher' | 'lower'): HlAnswer {
  const { metric, left, right, a, b } = buildPair(seedKey, index, difficulty)
  const isHigher = b > a
  const correct = (choice === 'higher') === isHigher
  return {
    correct,
    rightDisplay: metric.format(b),
    differenceDisplay: metric.diff(a, b),
    explanation: `${right.name}'s ${metric.noun} is ${metric.diff(a, b)} ${isHigher ? 'higher' : 'lower'} than ${left.name}'s.`,
  }
}
