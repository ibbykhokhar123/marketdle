'use client'

import { useState } from 'react'
import { Check, Lightbulb, Lock, RotateCcw, X } from 'lucide-react'
import type { ChartRange, ChartResponse, UniverseEntry } from '@/lib/types'
import { useGuessGame } from '@/lib/client/use-guess-game'
import { GameHeader, newSeed, type PlayMode } from '@/components/game/game-header'
import { StockSearch } from '@/components/game/stock-search'
import { PriceChart } from '@/components/game/price-chart'
import { CompanyReveal } from '@/components/game/company-reveal'
import { ShareButton } from '@/components/game/share-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RANGES: ChartRange[] = ['1M', '6M', '1Y', '5Y']
const RANGE_LABEL: Record<ChartRange, string> = { '1M': '1 month', '6M': '6 months', '1Y': '1 year', '5Y': '5 years' }

interface Props {
  universe: UniverseEntry[]
  today: string
  number: number
  maxGuesses: number
}

export function ChartGame({ universe, today, number, maxGuesses }: Props) {
  const [mode, setMode] = useState<PlayMode>('daily')
  const [seed, setSeed] = useState('')
  const [selected, setSelected] = useState<ChartRange | null>(null)

  const shareText = (d: ChartResponse) =>
    [
      `Marketdle Guess the Chart #${number} ${d.status === 'won' ? d.guesses.length : 'X'}/${maxGuesses}`,
      d.guesses.map((g) => (g.correct ? '🟩' : g.sameSector ? '🟨' : '🟥')).join('') +
        '⬜'.repeat(Math.max(0, maxGuesses - d.guesses.length)),
    ].join('\n')

  const game = useGuessGame<ChartResponse>({
    game: 'chart',
    date: today,
    mode,
    seed,
    score: (_d, n) => (maxGuesses + 1 - n) * 100,
    share: shareText,
  })

  const changeMode = (m: PlayMode) => {
    setMode(m)
    setSelected(null)
    if (m === 'practice') {
      setSeed(newSeed())
      game.resetPractice()
    }
  }

  const data = game.data
  const over = data && data.status !== 'playing'
  const available = RANGES.filter((r) => data?.ranges[r])
  const widest = available[available.length - 1]
  const range = selected && data?.ranges[selected] ? selected : widest
  const series = range ? (data?.ranges[range] ?? []) : []

  return (
    <div className="space-y-8">
      <GameHeader
        puzzleLabel={mode === 'daily' ? `Daily puzzle #${number}` : 'Practice · unlimited'}
        title="Guess the Chart"
        subtitle="Company names are hidden. Read the price action and identify the stock. Every miss reveals a clue. Your second miss unlocks the five-year view."
        mode={mode}
        onModeChange={changeMode}
      />

      <section aria-label="Mystery stock chart" className="rounded-2xl border bg-card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            {over && data.reveal ? (
              <>
                <span className="font-mono text-primary">{data.reveal.ticker}</span> · {data.reveal.name}
              </>
            ) : (
              <span className="font-mono tracking-widest text-muted-foreground">??? · Mystery Co.</span>
            )}
          </p>
          <div role="tablist" aria-label="Timeframe" className="inline-flex rounded-lg border bg-muted/50 p-1">
            {RANGES.map((r) => {
              const locked = !data?.ranges[r]
              return (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={range === r}
                  aria-label={locked ? `${RANGE_LABEL[r]}, locked` : RANGE_LABEL[r]}
                  disabled={locked}
                  onClick={() => setSelected(r)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    range === r && 'bg-background text-foreground shadow-sm',
                  )}
                >
                  {locked && <Lock className="size-3" aria-hidden="true" />}
                  {r}
                </button>
              )
            })}
          </div>
        </div>
        {game.loading ? (
          <div className="h-[300px] animate-pulse rounded-xl bg-muted/50" />
        ) : (
          <PriceChart data={series} height={300} zoomable label={`Mystery stock, ${range ? RANGE_LABEL[range] : ''} price chart`} />
        )}
        <p className="mt-3 text-xs text-muted-foreground">On longer timeframes, drag the handles below the chart to zoom. Prices are illustrative.</p>
      </section>

      {!over && (
        <div className="space-y-2">
          <StockSearch universe={universe} excluded={game.guesses} disabled={game.pending || !data} onSelect={game.submit} placeholder="Which company is this?" />
          <p className="text-xs text-muted-foreground tabular" aria-live="polite">
            {game.error ? (
              <span className="text-negative">{game.error}</span>
            ) : (
              `Guess ${Math.min(game.guesses.length + 1, maxGuesses)} of ${maxGuesses}${game.pending ? ' · checking…' : ''}`
            )}
          </p>
        </div>
      )}

      {data && (data.guesses.length > 0 || data.clues.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="guesses-title" className="rounded-xl border bg-card p-4">
            <h2 id="guesses-title" className="text-sm font-semibold">Your guesses</h2>
            <ol className="mt-3 space-y-2">
              {data.guesses.map((g) => (
                <li key={g.ticker} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-md',
                      g.correct ? 'bg-positive text-positive-foreground' : g.sameSector ? 'bg-gold text-gold-foreground' : 'bg-negative/15 text-negative',
                    )}
                  >
                    {g.correct ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                  </span>
                  <span className="font-mono font-semibold">{g.ticker}</span>
                  <span className="truncate text-muted-foreground">{g.name}</span>
                  {!g.correct && g.sameSector && <span className="ml-auto text-xs text-gold">Same sector</span>}
                </li>
              ))}
            </ol>
          </section>
          {data.clues.length > 0 && (
            <section aria-labelledby="clues-title" className="rounded-xl border bg-card p-4">
              <h2 id="clues-title" className="flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="size-4 text-gold" aria-hidden="true" /> Clues unlocked
              </h2>
              <dl className="mt-3 space-y-3">
                {data.clues.map((c) => (
                  <div key={c.title}>
                    <dt className="text-xs text-muted-foreground">{c.title}</dt>
                    <dd className="text-sm">{c.body}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {over && data.reveal && (
        <div className="space-y-6">
          <div
            role="status"
            className={cn(
              'flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between',
              data.status === 'won' ? 'border-positive/40 bg-positive/10' : 'border-negative/40 bg-negative/10',
            )}
          >
            <div>
              <p className="text-lg font-semibold">{data.status === 'won' ? `Spotted in ${data.guesses.length}/${maxGuesses}` : 'Chart stumped you'}</p>
              <p className="text-sm text-muted-foreground">
                {data.status === 'won'
                  ? `+${(maxGuesses + 1 - data.guesses.length) * 100} points`
                  : `It was ${data.reveal.name} (${data.reveal.ticker}).`}
              </p>
            </div>
            {mode === 'daily' ? (
              <ShareButton text={shareText(data)} />
            ) : (
              <Button size="lg" onClick={() => changeMode('practice')}>
                <RotateCcw aria-hidden="true" /> New practice chart
              </Button>
            )}
          </div>
          <CompanyReveal company={data.reveal} />
        </div>
      )}
    </div>
  )
}
