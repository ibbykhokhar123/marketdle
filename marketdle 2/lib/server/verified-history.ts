import 'server-only'
import type { PricePoint } from '@/lib/types'

// A separate server-only dataset avoids shipping any history/universe answers to the client.
const histories: Record<string, [string, number][]> = require('../../data/stock-expansion/expanded-histories.json')
export function hasVerifiedHistory(ticker: string): boolean {
  return (histories[ticker]?.length ?? 0) >= 22
}
export function verifiedHistory(ticker: string): PricePoint[] {
  return (histories[ticker] ?? []).map(([date, close]) => ({ date, close }))
}
