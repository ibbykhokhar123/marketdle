import type { Metadata } from 'next'
import { connection } from 'next/server'
import { etDate, puzzleNumber } from '@/lib/date'
import { universe } from '@/lib/server/common'
import { WORDLE_MAX } from '@/lib/server/wordle'
import { WordleGame } from '@/components/wordle/wordle-game'

export const metadata: Metadata = {
  title: 'Stock Wordle',
  description: 'Guess the mystery public company in six tries using sector, market cap, price, P/E, country and IPO clues.',
}

export default async function WordlePage() {
  await connection()
  const today = etDate()
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <WordleGame universe={universe()} today={today} number={puzzleNumber(today)} maxGuesses={WORDLE_MAX} />
    </div>
  )
}
