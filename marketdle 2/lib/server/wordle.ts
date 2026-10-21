import 'server-only'
import { seeded, shuffle } from '@/lib/rng'
import { formatBillions, formatPrice } from '@/lib/format'
import type { FeedbackCell, WordleHint, WordleResponse, WordleRow } from '@/lib/types'
import { COMPANIES, DATA_AS_OF, getCompany, companyDataDate, comparisonDataDate, type Company } from './companies'
import { keyString, marketCapRange, toReveal, type PuzzleKey } from './common'
import { seriesForRange } from './series'
import { companiesForPuzzle, companyForPuzzle } from './stock-pools'

export const WORDLE_MAX = 6

function poolOrder(key: PuzzleKey): Company[] {
  return shuffle(companiesForPuzzle(key), seeded('wordle-pool-v1'))
}

export function wordleAnswer(key: PuzzleKey): Company {
  const pool = poolOrder(key)
  if (key.kind === 'daily') {
    const day = Math.floor(Date.parse(`${key.date}T00:00:00Z`) / 86_400_000)
    return pool[((day % pool.length) + pool.length) % pool.length]
  }
  const rand = seeded(keyString('wordle', key))
  return pool[Math.floor(rand() * pool.length)]
}

function numericCell(
  key: FeedbackCell['key'],
  label: string,
  guess: number | null,
  answer: number | null,
  display: string,
  closeRatio: number,
  directionWords: [string, string] = ['Higher', 'Lower'],
): FeedbackCell {
  if (guess === null || answer === null) {
    const bothNull = guess === null && answer === null
    return {
      key,
      label,
      display,
      status: bothNull ? 'correct' : 'wrong',
      direction: null,
      directionLabel: bothNull ? 'Both N/A' : 'Not comparable',
    }
  }
  const ratio = Math.abs(guess - answer) / Math.max(Math.abs(answer), 1e-9)
  if (ratio <= 0.03) return { key, label, display, status: 'correct', direction: null, directionLabel: 'Match' }
  const up = answer > guess
  return {
    key,
    label,
    display,
    status: ratio <= closeRatio ? 'close' : 'wrong',
    direction: up ? 'up' : 'down',
    directionLabel: up ? directionWords[0] : directionWords[1],
  }
}

function yearCell(guess: Company, answer: Company): FeedbackCell {
  if (typeof guess.ipoYear !== 'number' || typeof answer.ipoYear !== 'number') {
    return { key: 'ipoYear', label: 'Listed', display: String(guess.ipoYear), status: guess.ticker === answer.ticker ? 'correct' : 'wrong', direction: null, directionLabel: 'Not available' }
  }
  const diff = answer.ipoYear - guess.ipoYear
  if (diff === 0)
    return { key: 'ipoYear', label: 'Listed', display: String(guess.ipoYear), status: 'correct', direction: null, directionLabel: 'Match' }
  return {
    key: 'ipoYear',
    label: 'Listed',
    display: String(guess.ipoYear),
    status: Math.abs(diff) <= 5 ? 'close' : 'wrong',
    direction: diff > 0 ? 'up' : 'down',
    directionLabel: diff > 0 ? 'Later' : 'Earlier',
  }
}

function categorical(key: FeedbackCell['key'], label: string, guess: string, answer: string): FeedbackCell {
  const match = guess === answer
  return { key, label, display: guess, status: match ? 'correct' : 'wrong', direction: null, directionLabel: match ? 'Match' : 'No match' }
}

export function compare(guess: Company, answer: Company): WordleRow {
  const comparable = companyDataDate(guess) === companyDataDate(answer)
  const dateAware = (cell: FeedbackCell): FeedbackCell => {
    if (!['marketCap', 'price', 'pe'].includes(cell.key)) return cell
    const display = guess.dataAsOf ? `${cell.display} · retrieved 10/20/26` : cell.display
    if (comparable) return { ...cell, display }
    return { ...cell, display, status: 'wrong', direction: null, directionLabel: 'Different snapshot dates' }
  }
  return {
    ticker: guess.ticker,
    name: guess.name,
    correct: guess.ticker === answer.ticker,
    cells: [
      categorical('sector', 'Sector', guess.sector, answer.sector),
      categorical('industry', 'Industry', guess.industry, answer.industry),
      numericCell('marketCap', 'Mkt Cap', guess.marketCap, answer.marketCap, formatBillions(guess.marketCap), 0.25),
      numericCell('price', 'Price', guess.price, answer.price, formatPrice(guess.price), 0.2),
      numericCell('pe', 'P/E', guess.pe, answer.pe, guess.pe === null ? 'N/A' : guess.pe.toFixed(0), 0.2),
      categorical('country', 'Country', guess.country, answer.country),
      yearCell(guess, answer),
    ].map(dateAware),
  }
}

function hintsFor(answer: Company, wrongCount: number): WordleHint[] {
  const all: WordleHint[] = [
    { kind: 'text', title: 'Sector', body: answer.sector },
    { kind: 'text', title: 'What it does', body: answer.blurb },
    { kind: 'text', title: 'Market cap range', body: marketCapRange(answer.marketCap) + (answer.dataAsOf ? ' (Nasdaq snapshot retrieved Oct 20, 2026)' : '') },
    ...(seriesForRange(answer, '1Y').length ? [{ kind: 'chart' as const, title: '1-year price chart', series: seriesForRange(answer, '1Y') }] : [{ kind: 'text' as const, title: 'Price chart', body: 'Verified historical prices are unavailable for this listing.' }]),
    { kind: 'text', title: 'Famous fact', body: answer.fact },
  ]
  return all.slice(0, Math.min(wrongCount, all.length))
}

export function evaluateWordle(key: PuzzleKey, guesses: string[]): WordleResponse | { error: string } {
  if (guesses.length > WORDLE_MAX) return { error: 'Too many guesses' }
  const answer = wordleAnswer(key)
  const rows: WordleRow[] = []
  const seen = new Set<string>()
  for (const raw of guesses) {
    const company = companyForPuzzle(raw, key)
    if (!company) return { error: `Unknown ticker: ${raw}` }
    if (seen.has(company.ticker)) return { error: `Duplicate guess: ${company.ticker}` }
    seen.add(company.ticker)
    rows.push(compare(company, answer))
    if (company.ticker === answer.ticker) break
  }
  const won = rows.some((r) => r.correct)
  const status = won ? 'won' : rows.length >= WORDLE_MAX ? 'lost' : 'playing'
  const wrong = rows.filter((r) => !r.correct).length
  return {
    puzzleId: keyString('wordle', key),
    rows,
    hints: hintsFor(answer, status === 'playing' ? wrong : 5),
    status,
    maxGuesses: WORDLE_MAX,
    reveal: status === 'playing' ? null : toReveal(answer),
    asOf: comparisonDataDate([answer, ...rows.map(row => companyForPuzzle(row.ticker, key)!)]),
  }
}
