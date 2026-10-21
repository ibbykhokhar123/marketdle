import type { Metadata } from 'next'
import { connection } from 'next/server'
import { etDate, puzzleNumber } from '@/lib/date'
import { universe } from '@/lib/server/common'
import { CHART_MAX } from '@/lib/server/chart'
import { ChartGame } from '@/components/chart/chart-game'

export const metadata: Metadata = {
  title: 'Guess the Chart',
  description: 'Identify a public company from its anonymous stock chart. Unlock longer timeframes and clues with each guess.',
}

export default async function ChartPage() {
  await connection()
  const today = etDate()
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <ChartGame universe={universe()} today={today} number={puzzleNumber(today)} maxGuesses={CHART_MAX} />
    </div>
  )
}
