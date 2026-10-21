'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ArrowDown, ArrowRight, ArrowUp, Check, Flame, RotateCcw, Trophy, X } from 'lucide-react'
import type { HlAnswer, HlDifficulty, HlRound } from '@/lib/types'
import { postJson } from '@/lib/client/use-guess-game'
import { saveEndlessBest, saveRecord, useHydrated, useRecord, useStore } from '@/lib/client/store'
import { GameHeader, newSeed, type PlayMode } from '@/components/game/game-header'
import { ShareButton } from '@/components/game/share-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  today: string
  number: number
  rounds: number
}

interface Revealed {
  index: number
  choice: 'higher' | 'lower'
  answer: HlAnswer
}

const DIFFICULTIES: { value: HlDifficulty; label: string; note: string }[] = [
  { value: 'beginner', label: 'Beginner', note: 'Big, obvious gaps' },
  { value: 'standard', label: 'Standard', note: 'Mixed matchups' },
  { value: 'expert', label: 'Expert', note: 'Neck-and-neck' },
]

export function pointsForHl(answers: boolean[]) {
  const correct = answers.filter(Boolean).length
  return correct * 50 + (correct === answers.length && answers.length > 0 ? 100 : 0)
}

export function HigherLowerGame({ today, number, rounds }: Props) {
  const hydrated = useHydrated()
  const record = useRecord('hl', today)
  const best = useStore().best.hlEndless
  const [mode, setMode] = useState<PlayMode>('daily')
  const [seed, setSeed] = useState('')
  const [difficulty, setDifficulty] = useState<HlDifficulty>('standard')
  const [endlessAnswers, setEndlessAnswers] = useState<boolean[]>([])
  const [revealed, setRevealed] = useState<Revealed | null>(null)
  const [autoAdvance, setAutoAdvance] = useState(true)
  useEffect(() => {
    if (!revealed || !autoAdvance) return
    const timer = setTimeout(() => setRevealed(null), 6000)
    return () => clearTimeout(timer)
  }, [revealed, autoAdvance])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const answers = mode === 'daily' ? (record?.hlAnswers ?? []) : endlessAnswers
  const finished = mode === 'daily' ? answers.length >= rounds : endlessAnswers.includes(false)
  const index = revealed ? revealed.index : answers.length
  const puzzle = mode === 'daily' ? { mode: 'daily', date: today } : { mode: 'practice', seed, difficulty }
  const ready = hydrated && (mode === 'daily' || seed) && !(finished && !revealed)

  const { data: round, error: loadError } = useSWR(
    ready ? ['/api/hl', JSON.stringify(puzzle), index] : null,
    ([url, p, i]) => postJson<{ round: HlRound }>(url, { ...JSON.parse(p), index: i }).then((r) => r.round),
    { revalidateOnFocus: false },
  )

  const startEndless = (d: HlDifficulty = difficulty) => {
    setDifficulty(d)
    setSeed(newSeed())
    setEndlessAnswers([])
    setRevealed(null)
    setError(null)
  }

  const changeMode = (m: PlayMode) => {
    setMode(m)
    setRevealed(null)
    if (m === 'practice') startEndless()
  }

  const choose = async (choice: 'higher' | 'lower') => {
    if (pending || revealed || !round) return
    setPending(true)
    setError(null)
    try {
      const { answer } = await postJson<{ answer: HlAnswer }>('/api/hl', { ...puzzle, index, choice })
      setRevealed({ index, choice, answer })
      const next = [...answers, answer.correct]
      if (mode === 'daily') {
        const done = next.length >= rounds
        const correct = next.filter(Boolean).length
        saveRecord({
          mode: 'hl',
          date: today,
          hlAnswers: next,
          status: done ? (correct >= rounds * 0.6 ? 'won' : 'lost') : 'playing',
          points: pointsForHl(next),
          share: done
            ? `Marketdle Higher or Lower #${number} ${correct}/${rounds}\n${next.map((a) => (a ? '🟩' : '🟥')).join('')}`
            : undefined,
        })
      } else {
        setEndlessAnswers(next)
        saveEndlessBest(difficulty, next.filter(Boolean).length)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  const correctCount = answers.filter(Boolean).length
  const streak = mode === 'practice' ? endlessAnswers.filter(Boolean).length : correctCount
  const showSummary = finished && !revealed

  return (
    <div className="space-y-8">
      <GameHeader
        puzzleLabel={mode === 'daily' ? `Daily challenge #${number} · ${rounds} rounds` : `Endless · ${difficulty}`}
        title="Higher or Lower"
        subtitle="Two companies, one metric. Decide whether the company on the right is higher or lower. Mixes market cap, revenue, profit, P/E, price, growth, and headcount."
        mode={mode}
        onModeChange={changeMode}
        practiceLabel="Endless"
      />

      {mode === 'practice' && (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Difficulty</legend>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={difficulty === d.value}
              onClick={() => startEndless(d.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                difficulty === d.value ? 'border-primary bg-primary/10' : 'hover:bg-muted',
              )}
            >
              <span className="block font-medium">{d.label}</span>
              <span className="block text-xs text-muted-foreground">
                {d.note} · best {best[d.value]}
              </span>
            </button>
          ))}
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} className="accent-primary"/> Automatically advance after 6 seconds</label>
      {loadError && <p role="alert" className="text-sm text-negative">Unable to load this matchup. Check your connection and reload.</p>}
      <Progress mode={mode} answers={answers} rounds={rounds} streak={streak} best={best[difficulty]} />

      {showSummary ? (
        <Summary
          mode={mode}
          answers={answers}
          rounds={rounds}
          share={record?.share}
          best={best[difficulty]}
          onRestart={() => startEndless()}
        />
      ) : (
        <Matchup round={round} revealed={revealed} pending={pending} onChoose={choose} />
      )}

      <div aria-live="polite" className="min-h-6">
        {error && <p className="text-sm text-negative">{error}</p>}
        {revealed && (
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn('flex items-center gap-2 font-semibold', revealed.answer.correct ? 'text-positive' : 'text-negative')}>
                {revealed.answer.correct ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                {revealed.answer.correct ? 'Correct' : 'Not quite'} · {revealed.answer.differenceDisplay}
              </p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{revealed.answer.explanation}</p>
            </div>
            <Button size="lg" onClick={() => setRevealed(null)} autoFocus>
              {finished ? 'See results' : 'Next round'} <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Progress({ mode, answers, rounds, streak, best }: { mode: PlayMode; answers: boolean[]; rounds: number; streak: number; best: number }) {
  if (mode === 'practice') {
    return (
      <div className="flex items-center gap-6 text-sm">
        <span className="flex items-center gap-2">
          <Flame className="size-4 text-gold" aria-hidden="true" /> Streak <strong className="tabular">{streak}</strong>
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="size-4" aria-hidden="true" /> Best <strong className="tabular">{best}</strong>
        </span>
      </div>
    )
  }
  return (
    <ol className="flex gap-1.5" aria-label={`Round ${Math.min(answers.length + 1, rounds)} of ${rounds}`}>
      {Array.from({ length: rounds }, (_, i) => (
        <li
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            i < answers.length ? (answers[i] ? 'bg-positive' : 'bg-negative') : i === answers.length ? 'bg-primary/50' : 'bg-muted',
          )}
        />
      ))}
    </ol>
  )
}

function CompanyCard({ ticker, name, exchange, children, highlight }: { ticker: string; name: string; exchange: string; children: React.ReactNode; highlight?: 'good' | 'bad' }) {
  return (
    <div
      className={cn(
        'flex min-h-56 flex-col justify-between rounded-2xl border bg-card p-5 transition-colors',
        highlight === 'good' && 'border-positive bg-positive/5',
        highlight === 'bad' && 'border-negative bg-negative/5',
      )}
    >
      <div>
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-xs font-semibold text-primary" aria-hidden="true">{ticker}</div>
        <p className="font-mono text-sm font-semibold text-primary">{ticker}</p>
        <h2 className="mt-1 text-xl font-semibold text-balance">{name}</h2>
        <p className="text-xs text-muted-foreground">{exchange}</p>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  )
}

function Matchup({
  round,
  revealed,
  pending,
  onChoose,
}: {
  round: HlRound | undefined
  revealed: Revealed | null
  pending: boolean
  onChoose: (c: 'higher' | 'lower') => void
}) {
  if (!round) {
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
        <div className="h-56 animate-pulse rounded-2xl bg-muted/50" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    )
  }
  return (
    <section aria-label="Current matchup" className="space-y-4">
      <div className="text-center">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{round.metric.label}</p>
        <p className="mt-1 text-lg font-semibold text-balance">{round.metric.question}</p>
        <p className="text-xs text-muted-foreground">
          {round.metric.unitNote} · as of {round.asOf}
        </p>
      </div>
      <div className="relative grid gap-4 md:grid-cols-2">
        <CompanyCard {...round.left}>
          <p className="text-xs text-muted-foreground">{round.metric.label}</p>
          <p className="text-3xl font-semibold tabular">{round.left.display}</p>
        </CompanyCard>
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 z-10 hidden size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-xs font-semibold md:flex"
        >
          VS
        </span>
        <CompanyCard {...round.right} highlight={revealed ? (revealed.answer.correct ? 'good' : 'bad') : undefined}>
          {revealed ? (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs text-muted-foreground">{round.metric.label}</p>
              <p className="text-3xl font-semibold tabular">{revealed.answer.rightDisplay}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" className="h-12 bg-positive text-positive-foreground hover:bg-positive/90" disabled={pending} onClick={() => onChoose('higher')}>
                <ArrowUp aria-hidden="true" /> Higher
              </Button>
              <Button size="lg" className="h-12 bg-negative text-negative-foreground hover:bg-negative/90" disabled={pending} onClick={() => onChoose('lower')}>
                <ArrowDown aria-hidden="true" /> Lower
              </Button>
            </div>
          )}
        </CompanyCard>
      </div>
    </section>
  )
}

function Summary({
  mode,
  answers,
  rounds,
  share,
  best,
  onRestart,
}: {
  mode: PlayMode
  answers: boolean[]
  rounds: number
  share?: string
  best: number
  onRestart: () => void
}) {
  const correct = answers.filter(Boolean).length
  if (mode === 'practice') {
    return (
      <div role="status" className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Streak over</p>
        <p className="mt-1 text-5xl font-semibold tabular">{correct}</p>
        <p className="mt-2 text-sm text-muted-foreground">Personal best: {best}</p>
        <Button size="lg" className="mt-6" onClick={onRestart}>
          <RotateCcw aria-hidden="true" /> Play again
        </Button>
      </div>
    )
  }
  return (
    <div role="status" className="rounded-2xl border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">Daily challenge complete</p>
      <p className="mt-1 text-5xl font-semibold tabular">
        {correct}/{rounds}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">+{pointsForHl(answers)} points</p>
      {share && <ShareButton text={share} className="mt-6" />}
    </div>
  )
}
