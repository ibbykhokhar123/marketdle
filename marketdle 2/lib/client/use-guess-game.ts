'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { GameMode, GameStatus } from '@/lib/types'
import { saveRecord, useHydrated, useRecord } from './store'
import type { PlayMode } from '@/components/game/game-header'

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json as T
}

interface Options<T> {
  game: Extract<GameMode, 'wordle' | 'chart'>
  date: string
  mode: PlayMode
  seed: string
  score: (data: T, guessCount: number) => number
  share: (data: T) => string
}

export function useGuessGame<T extends { status: GameStatus }>({ game, date, mode, seed, score, share }: Options<T>) {
  const hydrated = useHydrated()
  const record = useRecord(game, date)
  const [practiceGuesses, setPracticeGuesses] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guesses = mode === 'daily' ? (record?.guesses ?? []) : practiceGuesses
  const puzzle = mode === 'daily' ? { mode: 'daily', date } : { mode: 'practice', seed }
  const keyFor = (list: string[]) => ['/api/' + game, JSON.stringify(puzzle), list.join(',')] as const
  const ready = hydrated && (mode === 'daily' || seed.length > 0)

  const { data, isLoading, error: loadError } = useSWR(
    ready ? keyFor(guesses) : null,
    ([url, p, list]) => postJson<T>(url, { ...JSON.parse(p), guesses: list ? list.split(',') : [] }),
    { revalidateOnFocus: false, keepPreviousData: false },
  )

  const submit = async (ticker: string) => {
    if (pending || data?.status !== 'playing') return
    const next = [...guesses, ticker]
    setPending(true)
    setError(null)
    try {
      const result = await postJson<T>(`/api/${game}`, { ...puzzle, guesses: next })
      await globalMutate(keyFor(next), result, { revalidate: false })
      if (mode === 'daily') {
        saveRecord({
          mode: game,
          date,
          guesses: next,
          status: result.status,
          points: result.status === 'won' ? score(result, next.length) : 0,
          share: result.status === 'playing' ? undefined : share(result),
        })
      } else {
        setPracticeGuesses(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  const resetPractice = () => {
    setPracticeGuesses([])
    setError(null)
  }

  return { data, guesses, submit, pending, error: error ?? (loadError ? 'Unable to load this puzzle. Check your connection and reload.' : null), loading: !data && (isLoading || !ready), resetPractice }
}
