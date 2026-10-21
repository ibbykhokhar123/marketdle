import type { Metadata } from 'next'
import { connection } from 'next/server'
import { etDate, puzzleNumber } from '@/lib/date'
import { rankingPuzzle } from '@/lib/server/ranking'
import { RankingGame } from '@/components/ranking/ranking-game'

export const metadata: Metadata = {
  title: 'Market Cap Ranking',
  description: 'Put five public companies in order from smallest to largest market capitalization.',
}

const SEED = /^[a-z0-9-]{4,40}$/i

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ practice?: string }> }) {
  await connection()
  const { practice } = await searchParams
  const today = etDate()
  const seed = practice && SEED.test(practice) ? practice : null
  const companies = rankingPuzzle(seed ? { kind: 'practice', seed } : { kind: 'daily', date: today })
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <RankingGame key={seed ?? today} companies={companies} today={today} number={puzzleNumber(today)} seed={seed} />
    </div>
  )
}
