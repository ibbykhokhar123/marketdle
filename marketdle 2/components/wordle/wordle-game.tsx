'use client'

import { useState } from 'react'
import { Lightbulb, LineChart, RotateCcw } from 'lucide-react'
import type { UniverseEntry, WordleResponse } from '@/lib/types'
import { useGuessGame } from '@/lib/client/use-guess-game'
import { GameHeader, newSeed, type PlayMode } from '@/components/game/game-header'
import { StockSearch } from '@/components/game/stock-search'
import { CompanyReveal } from '@/components/game/company-reveal'
import { ShareButton } from '@/components/game/share-button'
import { PriceChart } from '@/components/game/price-chart'
import { Button } from '@/components/ui/button'
import { WordleBoard } from './wordle-board'

interface Props {
  universe: UniverseEntry[]
  today: string
  number: number
  maxGuesses: number
}

const EMOJI = { correct: '🟩', close: '🟨', wrong: '⬛' } as const

export function WordleGame({ universe, today, number, maxGuesses }: Props) {
  const [mode, setMode] = useState<PlayMode>('daily')
  const [seed, setSeed] = useState('')

  const shareText = (d: WordleResponse) =>
    [
      `Marketdle Stock Wordle #${number} ${d.status === 'won' ? d.rows.length : 'X'}/${maxGuesses}`,
      ...d.rows.map((r) => r.cells.map((c) => EMOJI[c.status]).join('')),
    ].join('\n')

  const game = useGuessGame<WordleResponse>({
    game: 'wordle',
    date: today,
    mode,
    seed,
    score: (_d, n) => (maxGuesses + 1 - n) * 100,
    share: shareText,
  })

  const changeMode = (m: PlayMode) => {
    setMode(m)
    if (m === 'practice') {
      setSeed(newSeed())
      game.resetPractice()
    }
  }

  const data = game.data
  const over = data && data.status !== 'playing'
  const points = data?.status === 'won' ? (maxGuesses + 1 - data.rows.length) * 100 : 0

  return (
    <div className="space-y-8">
      <GameHeader
        puzzleLabel={mode === 'daily' ? `Daily puzzle #${number}` : 'Practice · unlimited'}
        title="Stock Wordle"
        subtitle="Name the mystery public company. Each guess compares sector, industry, market cap, price, P/E, country, and IPO year."
        mode={mode}
        onModeChange={changeMode}
      />

      <Legend />

      {!over && (
        <div className="space-y-2">
          <StockSearch universe={universe} excluded={game.guesses} disabled={game.pending || !data} onSelect={game.submit} />
          <p className="text-xs text-muted-foreground tabular" aria-live="polite">
            {game.error ? (
              <span className="text-negative">{game.error}</span>
            ) : (
              `Guess ${Math.min(game.guesses.length + 1, maxGuesses)} of ${maxGuesses}${game.pending ? ' · checking…' : ''}`
            )}
          </p>
        </div>
      )}

      <WordleBoard rows={data?.rows ?? []} maxGuesses={maxGuesses} loading={game.loading} />

      {data && data.hints.length > 0 && !over && (
        <section aria-label="Unlocked hints" className="grid gap-3 md:grid-cols-2">
          {data.hints.map((hint) => (
            <div key={hint.title} className="rounded-xl border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                {hint.kind === 'chart' ? <LineChart className="size-4 text-primary" aria-hidden="true" /> : <Lightbulb className="size-4 text-gold" aria-hidden="true" />}
                {hint.title}
              </h2>
              {hint.kind === 'text' ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{hint.body}</p>
              ) : (
                <div className="mt-2">
                  <PriceChart data={hint.series} height={140} showAxes={false} label="One-year price chart hint" />
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {over && data.reveal && (
        <div className="space-y-6">
          <div
            role="status"
            className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${data.status === 'won' ? 'border-positive/40 bg-positive/10' : 'border-negative/40 bg-negative/10'}`}
          >
            <div>
              <p className="text-lg font-semibold">
                {data.status === 'won' ? `Solved in ${data.rows.length}/${maxGuesses}` : 'Out of guesses'}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.status === 'won' ? `+${points} points` : `It was ${data.reveal.name} (${data.reveal.ticker}).`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {mode === 'daily' ? (
                <ShareButton text={shareText(data)} />
              ) : (
                <Button size="lg" onClick={() => changeMode('practice')}>
                  <RotateCcw aria-hidden="true" /> New practice puzzle
                </Button>
              )}
            </div>
          </div>
          <CompanyReveal company={data.reveal} />
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Color legend">
      <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-positive" aria-hidden="true" /> Match (numeric values within 3%)</li>
      <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-gold" aria-hidden="true" /> Close (numeric values or IPO year)</li>
      <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-muted-foreground/40" aria-hidden="true" /> Not close</li>
      <li className="flex items-center gap-2">Arrows show if the answer is higher or lower</li>
    </ul>
  )
}
