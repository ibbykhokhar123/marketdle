import { addDays } from '@/lib/date'
import type { GameRecord, StoreState } from '@/lib/client/store'
import type { GameMode } from '@/lib/types'

export const MODES: { mode: GameMode; label: string; href: string }[] = [
  { mode: 'wordle', label: 'Stock Wordle', href: '/play/wordle' },
  { mode: 'hl', label: 'Higher or Lower', href: '/play/higher-lower' },
  { mode: 'chart', label: 'Guess the Chart', href: '/play/chart' },
  { mode: 'ranking', label: 'Market Cap Ranking', href: '/play/ranking' },
  { mode: 'trivia', label: 'Market Trivia', href: '/play/trivia' },
]

export interface Stats {
  played: number
  wins: number
  winRate: number
  averageGuesses: number | null
  totalPoints: number
  currentStreak: number
  longestStreak: number
  perfectDays: number
  byMode: Record<GameMode, { played: number; wins: number; points: number }>
  wordleDistribution: number[]
  dailyPoints: { date: string; points: number }[]
  completedToday: GameMode[]
}

export function computeStats(state: StoreState, today: string): Stats {
  const done: GameRecord[] = Object.values(state.records).filter((r) => r.status !== 'playing')
  const byMode = Object.fromEntries(MODES.map((m) => [m.mode, { played: 0, wins: 0, points: 0 }])) as Stats['byMode']
  const days = new Map<string, GameRecord[]>()
  const wordleDistribution = [0, 0, 0, 0, 0, 0]
  let wordleWinGuesses = 0
  let wordleWins = 0

  for (const r of done) {
    byMode[r.mode].played++
    byMode[r.mode].points += r.points
    if (r.status === 'won') byMode[r.mode].wins++
    if (r.mode === 'wordle' && r.status === 'won' && r.guesses) {
      wordleDistribution[r.guesses.length - 1]++
      wordleWinGuesses += r.guesses.length
      wordleWins++
    }
    const list = days.get(r.date) ?? []
    list.push(r)
    days.set(r.date, list)
  }

  let currentStreak = 0
  let cursor = days.has(today) ? today : addDays(today, -1)
  while (days.has(cursor)) {
    currentStreak++
    cursor = addDays(cursor, -1)
  }

  const sortedDays = [...days.keys()].sort()
  let longestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const d of sortedDays) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    longestStreak = Math.max(longestStreak, run)
    prev = d
  }

  let perfectDays = 0
  for (const list of days.values()) {
    const won = new Set(list.filter((r) => r.status === 'won').map((r) => r.mode))
    if (won.size === MODES.length) perfectDays++
  }

  const dailyPoints = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13)
    return { date, points: (days.get(date) ?? []).reduce((sum, r) => sum + r.points, 0) }
  })

  const wins = done.filter((r) => r.status === 'won').length
  return {
    played: done.length,
    wins,
    winRate: done.length ? Math.round((wins / done.length) * 100) : 0,
    averageGuesses: wordleWins ? Math.round((wordleWinGuesses / wordleWins) * 10) / 10 : null,
    totalPoints: done.reduce((sum, r) => sum + r.points, 0),
    currentStreak,
    longestStreak,
    perfectDays,
    byMode,
    wordleDistribution,
    dailyPoints,
    completedToday: (days.get(today) ?? []).map((r) => r.mode),
  }
}

export interface Achievement {
  id: string
  title: string
  description: string
  unlocked: boolean
}

export function achievements(stats: Stats, state: StoreState): Achievement[] {
  const records = Object.values(state.records)
  return [
    { id: 'first', title: 'Opening Bell', description: 'Complete your first daily game', unlocked: stats.played >= 1 },
    { id: 'streak3', title: 'On a Run', description: 'Reach a 3-day streak', unlocked: stats.longestStreak >= 3 },
    { id: 'streak7', title: 'Bull Run', description: 'Reach a 7-day streak', unlocked: stats.longestStreak >= 7 },
    { id: 'perfect', title: 'Perfect Session', description: 'Win all five daily games in one day', unlocked: stats.perfectDays >= 1 },
    { id: 'sniper', title: 'Insider Instinct', description: 'Solve Stock Wordle in 2 guesses or fewer', unlocked: records.some((r) => r.mode === 'wordle' && r.status === 'won' && (r.guesses?.length ?? 9) <= 2) },
    { id: 'points', title: 'Four Figures', description: 'Earn 1,000 total points', unlocked: stats.totalPoints >= 1000 },
    { id: 'hl10', title: 'Flawless Tape', description: 'Go 10 for 10 in Daily Higher or Lower', unlocked: records.some((r) => r.mode === 'hl' && r.hlAnswers?.filter(Boolean).length === 10) },
    { id: 'ranker', title: 'Cap Table Pro', description: 'Rank all five companies correctly', unlocked: records.some((r) => r.mode === 'ranking' && r.points >= 600) },
  ]
}
