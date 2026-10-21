'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ChevronDown, ChevronUp, GripVertical, RotateCcw } from 'lucide-react'
import type { RankingCompany, RankingResult } from '@/lib/types'
import { postJson } from '@/lib/client/use-guess-game'
import { saveRecord, useHydrated, useRecord, useStore } from '@/lib/client/store'
import { GameHeader, newSeed } from '@/components/game/game-header'
import { ShareButton } from '@/components/game/share-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  companies: RankingCompany[]
  today: string
  number: number
  seed: string | null
}

export function RankingGame({ companies, today, number, seed }: Props) {
  const router = useRouter()
  const hydrated = useHydrated()
  const record = useRecord('ranking', today)
  const mode = seed ? 'practice' : 'daily'
  const [order, setOrder] = useState(() => companies.map((c) => c.ticker))
  const [hasMoved, setHasMoved] = useState(false)
  const stored = useStore().records[`ranking:${today}`]?.order
  const effectiveOrder = !seed && !hasMoved && stored ? stored : order
  const [dragging, setDragging] = useState<string | null>(null)
  const [result, setResult] = useState<RankingResult | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const byTicker = new Map(companies.map((c) => [c.ticker, c]))

  const dailyOrder = mode === 'daily' && record?.status !== 'playing' ? record?.order : undefined
  const submittedOrder = result ? effectiveOrder : dailyOrder
  const done = Boolean(result || dailyOrder)

  const { data: dailyResult } = useDailyResult(mode === 'daily' && hydrated && !result ? dailyOrder : undefined, today)
  const shown = result ?? dailyResult ?? null

  const move = (from: number, to: number) => {
    if (done || pending || to < 0 || to >= effectiveOrder.length || from === to) return
    setHasMoved(true)
    const next = [...effectiveOrder]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setOrder(next)
    if (!seed) saveRecord({mode: 'ranking', date: today, status: 'playing', points: 0, order: next})

  }

  const submit = async () => {
    if (pending || done) return
    const order = effectiveOrder
    setPending(true)
    setError(null)
    try {
      const res = await postJson<RankingResult>('/api/ranking', seed ? { mode: 'practice', seed, order } : { mode: 'daily', date: today, order })
      setResult(res)
      if (mode === 'daily') {
        saveRecord({
          mode: 'ranking',
          date: today,
          order,
          status: res.correctCount >= 3 ? 'won' : 'lost',
          points: res.points,
          share: `Marketdle Market Cap Ranking #${number} ${res.correctCount}/5\n${[...res.results]
            .sort((a, b) => a.yourIndex - b.yourIndex)
            .map((r) => (r.correctIndex === r.yourIndex ? '🟩' : Math.abs(r.correctIndex - r.yourIndex) === 1 ? '🟨' : '🟥'))
            .join('')}`,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  const list = submittedOrder ?? effectiveOrder

  return (
    <div className="space-y-8">
      <GameHeader
        puzzleLabel={mode === 'daily' ? `Daily puzzle #${number}` : 'Practice · unlimited'}
        title="Market Cap Ranking"
        subtitle="Drag or use the arrows to order these five companies from smallest market cap (top) to largest (bottom)."
        mode={mode}
        onModeChange={(m) => router.push(m === 'daily' ? '/play/ranking' : `/play/ranking?practice=${newSeed()}`)}
      />

      <div className="flex items-center justify-between text-xs font-medium tracking-wider text-muted-foreground uppercase">
        <span>Smallest</span>
        {shown && <span>Actual market cap</span>}
      </div>

      <ol className="ranking-list space-y-2" aria-label="Your ranking">
        {list.map((ticker, i) => {
          const c = byTicker.get(ticker)!
          const r = shown?.results.find((x) => x.ticker === ticker)
          const status = r ? (r.correctIndex === r.yourIndex ? 'correct' : Math.abs(r.correctIndex - r.yourIndex) === 1 ? 'close' : 'wrong') : null
          return (
            <li
              key={ticker}
              draggable={!done && !pending}
              onDragStart={() => setDragging(ticker)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragging && dragging !== ticker) move(effectiveOrder.indexOf(dragging), i)
              }}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors',
                !done && 'cursor-grab active:cursor-grabbing',
                dragging === ticker && 'opacity-50',
                status === 'correct' && 'border-positive bg-positive/10',
                status === 'close' && 'border-gold bg-gold/10',
                status === 'wrong' && 'border-negative bg-negative/10',
              )}
            >
              <span className="w-6 text-center font-mono text-sm font-semibold text-muted-foreground tabular">{i + 1}</span>
              {!done && <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono text-primary">{c.ticker}</span> · {c.sector}
                </p>
              </div>
              {r ? (
                <div className="text-right">
                  <p className="font-semibold tabular">{r.marketCapDisplay}</p>
                  <p className="text-xs text-muted-foreground">{status === 'correct' ? 'Correct spot' : `Belongs at #${r.correctIndex + 1}`}</p>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" aria-label={`Move ${c.name} up`} disabled={i === 0 || done} onClick={() => move(i, i - 1)}>
                    <ChevronUp aria-hidden="true" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label={`Move ${c.name} down`} disabled={i === list.length - 1 || done} onClick={() => move(i, i + 1)}>
                    <ChevronDown aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Largest</p>

      <div aria-live="polite">
        {error && <p className="mb-3 text-sm text-negative">{error}</p>}
        {shown ? (
          <div role="status" className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{shown.correctCount}/5 in the right spot</p>
              <p className="text-sm text-muted-foreground">
                +{shown.points} points · market caps as of {shown.asOf}
              </p>
            </div>
            {mode === 'daily' ? (
              record?.share && <ShareButton text={record.share} />
            ) : (
              <Button size="lg" onClick={() => router.push(`/play/ranking?practice=${newSeed()}`)}>
                <RotateCcw aria-hidden="true" /> New practice set
              </Button>
            )}
          </div>
        ) : (
          !done && (
            <Button size="lg" className="w-full sm:w-auto" onClick={submit} disabled={pending || !hydrated}>
              {pending ? 'Checking…' : 'Lock in ranking'}
            </Button>
          )
        )}
      </div>
    </div>
  )
}

function useDailyResult(order: string[] | undefined, date: string) {
  return useSWR(order ? ['/api/ranking', date, order.join(',')] : null, ([url, d, o]) =>
    postJson<RankingResult>(url, { mode: 'daily', date: d, order: o.split(',') }),
  { revalidateOnFocus: false })
}
