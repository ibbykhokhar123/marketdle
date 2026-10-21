'use client'

import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Countdown } from './countdown'

export type PlayMode = 'daily' | 'practice'

interface GameHeaderProps {
  title: string
  subtitle: string
  puzzleLabel: string
  mode: PlayMode
  onModeChange: (mode: PlayMode) => void
  practiceLabel?: string
}

export function GameHeader({ title, subtitle, puzzleLabel, mode, onModeChange, practiceLabel = 'Practice' }: GameHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-medium tracking-wider text-primary uppercase">{puzzleLabel}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="mt-1.5 max-w-xl text-sm text-pretty text-muted-foreground">{subtitle}</p>
        <p className="mt-3 text-[10px] text-muted-foreground">DEMO EDITION · Approximate figures as of Jun 30, 2025 · Illustrative charts</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Game mode" className="inline-flex rounded-lg border bg-muted/50 p-1">
          {(['daily', 'practice'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => onModeChange(m)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
                mode === m && 'bg-background text-foreground shadow-sm',
              )}
            >
              {m === 'daily' ? 'Daily' : practiceLabel}
            </button>
          ))}
        </div>
        {mode === 'daily' && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            New in <Countdown />
          </p>
        )}
      </div>
    </div>
  )
}

export function newSeed() {
  return Math.random().toString(36).slice(2, 10)
}
