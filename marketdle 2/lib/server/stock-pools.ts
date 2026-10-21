import 'server-only'
import { CURRENT_COMPANIES, LEGACY_COMPANIES, type Company, canonicalTicker } from './companies'
import type { PuzzleKey } from './common'

// Immutable migration boundary: changing the universe must never change a live puzzle.
export const EXPANDED_DAILY_START = '2026-10-21'
export function usesLegacyPool(key: PuzzleKey): boolean {
  return key.kind === 'daily' && key.date < EXPANDED_DAILY_START
}
export function companiesForPuzzle(key: PuzzleKey): Company[] {
  return usesLegacyPool(key) ? LEGACY_COMPANIES : CURRENT_COMPANIES
}
export function companiesForSeed(seed: string): Company[] {
  const daily = /^hl:daily:(\d{4}-\d{2}-\d{2})$/.exec(seed)
  return daily && daily[1] < EXPANDED_DAILY_START ? LEGACY_COMPANIES : CURRENT_COMPANIES
}
export function companyForPuzzle(ticker: string, key: PuzzleKey): Company | undefined {
  const canonical = canonicalTicker(ticker)
  // Additions remain valid guesses on an old daily puzzle as well.
  return companiesForPuzzle(key).find(c => c.ticker === canonical)
    ?? CURRENT_COMPANIES.find(c => c.ticker === canonical)
}
