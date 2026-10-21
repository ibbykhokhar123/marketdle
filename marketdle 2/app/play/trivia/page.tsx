import type { Metadata } from 'next'
import { connection } from 'next/server'
import { etDate, puzzleNumber } from '@/lib/date'
import { triviaQuestions } from '@/lib/server/trivia'
import { TriviaGame } from '@/components/trivia/trivia-game'

export const metadata: Metadata = {
  title: 'Market Trivia',
  description: 'Five daily questions on investing history, famous companies, IPOs, CEOs, and market concepts.',
}

const SEED = /^[a-z0-9-]{4,40}$/i

export default async function TriviaPage({ searchParams }: { searchParams: Promise<{ practice?: string }> }) {
  await connection()
  const { practice } = await searchParams
  const today = etDate()
  const seed = practice && SEED.test(practice) ? practice : null
  const questions = triviaQuestions(seed ? { kind: 'practice', seed } : { kind: 'daily', date: today })
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <TriviaGame key={seed ?? today} questions={questions} today={today} number={puzzleNumber(today)} seed={seed} />
    </div>
  )
}
