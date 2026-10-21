'use client'

import { useSyncExternalStore } from 'react'
import type { GameMode, GameStatus, HlDifficulty } from '@/lib/types'

export interface GameRecord {
  mode: GameMode
  date: string
  status: GameStatus
  points: number
  guesses?: string[]
  hlAnswers?: boolean[]
  order?: string[]
  trivia?: Record<string, { choice: number; correct: boolean; points: number; answerIndex: number; explanation: string }>
  share?: string
  completedAt?: number
}

export interface StoreState {
  version: 1
  records: Record<string, GameRecord>
  best: { hlEndless: Record<HlDifficulty, number> }
}

const STORAGE_KEY = 'bellwether:v1'
const EVENT = 'bellwether-store'

const EMPTY: StoreState = {
  version: 1,
  records: {},
  best: { hlEndless: { beginner: 0, standard: 0, expert: 0 } },
}

let memoryOnly = false
let cachedRaw: string | null = null
let cachedState: StoreState = EMPTY

function read(): StoreState {
  if (typeof window === 'undefined') return EMPTY
  if (memoryOnly) return cachedState
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return cachedState
  }
  if (raw === cachedRaw) return cachedState
  cachedRaw = raw
  try {
    const parsed = raw ? (JSON.parse(raw) as StoreState) : EMPTY
    cachedState = { ...EMPTY, ...parsed, best: { hlEndless: { ...EMPTY.best.hlEndless, ...parsed?.best?.hlEndless } } }
  } catch {
    cachedState = EMPTY
  }
  return cachedState
}

function write(next: StoreState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be unavailable (private mode / quota); keep the in-memory copy.
    memoryOnly = true
    cachedRaw = JSON.stringify(next)
    cachedState = next
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function recordKey(mode: GameMode, date: string) {
  return `${mode}:${date}`
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

const noopSubscribe = () => () => {}
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

export function useRecord(mode: GameMode, date: string): GameRecord | undefined {
  return useStore().records[recordKey(mode, date)]
}

export function saveRecord(record: GameRecord) {
  const state = read()
  const key = recordKey(record.mode, record.date)
  const existing = state.records[key]
  if (existing && existing.status !== 'playing') return
  const completedAt = record.status !== 'playing' ? Date.now() : undefined
  write({ ...state, records: { ...state.records, [key]: { ...record, completedAt } } })
}

export function saveEndlessBest(difficulty: HlDifficulty, streak: number) {
  const state = read()
  if (streak <= state.best.hlEndless[difficulty]) return
  write({ ...state, best: { hlEndless: { ...state.best.hlEndless, [difficulty]: streak } } })
}

export function resetAll() {
  write(EMPTY)
}
