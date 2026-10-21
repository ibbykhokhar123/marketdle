import type { Metadata } from 'next'
import { connection } from 'next/server'
import { etDate, puzzleNumber } from '@/lib/date'
import { HL_DAILY_ROUNDS } from '@/lib/server/hl'
import { HigherLowerGame } from '@/components/hl/hl-game'

export const metadata: Metadata = {
  title: 'Higher or Lower',
  description: 'Is the next company bigger or smaller? Compare market cap, revenue, profit, P/E and more in a fast streak game.',
}

export default async function HigherLowerPage() {
  await connection()
  const today = etDate()
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <HigherLowerGame today={today} number={puzzleNumber(today)} rounds={HL_DAILY_ROUNDS} />
    </div>
  )
}
