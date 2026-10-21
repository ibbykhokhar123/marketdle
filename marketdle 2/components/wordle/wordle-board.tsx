import { ArrowDown, ArrowUp, Check, X } from 'lucide-react'
import type { FeedbackCell, WordleRow } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLUMNS = ['Company', 'Sector', 'Industry', 'Market cap', 'Price', 'P/E', 'Country', 'IPO year']
const GRID = 'grid grid-cols-[8.5rem_repeat(7,minmax(5.25rem,1fr))] gap-1.5'

const STATUS_CLASS: Record<FeedbackCell['status'], string> = {
  correct: 'bg-positive text-positive-foreground border-transparent',
  close: 'bg-gold text-gold-foreground border-transparent',
  wrong: 'bg-muted text-foreground border-border',
}
const STATUS_LABEL: Record<FeedbackCell['status'], string> = { correct: 'match', close: 'close', wrong: 'not close' }

function Cell({ cell, index }: { cell: FeedbackCell; index: number }) {
  return (
    <div
      role="cell"
      aria-label={`${cell.label}: ${cell.display}, ${STATUS_LABEL[cell.status]}${cell.direction ? `, answer is ${cell.directionLabel ?? (cell.direction === 'up' ? 'higher' : 'lower')}` : ''}`}
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(
        'wordle-cell flex min-h-14 flex-col items-center justify-center rounded-lg border px-1.5 py-1.5 text-center text-xs leading-tight font-medium animate-in fade-in zoom-in-95 fill-mode-both duration-300',
        STATUS_CLASS[cell.status],
      )}
    >
      <span className="wordle-mobile-label hidden" aria-hidden="true">{cell.key === 'ipoYear' ? 'IPO year' : cell.label}</span>
      <span className="wordle-value line-clamp-2 text-pretty">{cell.display}</span>
      {!cell.direction && <span className="mt-0.5 flex items-center gap-0.5 text-[10px] opacity-80">{cell.status === 'correct' ? <Check className="size-3" aria-hidden="true"/> : <X className="size-3" aria-hidden="true"/>}{cell.directionLabel ?? (cell.status === 'correct' ? 'Match' : 'No match')}</span>}
      {cell.direction && (
        <span className="mt-0.5 flex items-center gap-0.5 text-[10px] opacity-80">
          {cell.direction === 'up' ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
          {cell.directionLabel}
        </span>
      )}
    </div>
  )
}

export function WordleBoard({ rows, maxGuesses, loading }: { rows: WordleRow[]; maxGuesses: number; loading: boolean }) {
  const empty = Math.max(0, maxGuesses - rows.length)
  return (
    <div className="wordle-board -mx-4 overflow-x-auto px-4 pb-2">
      <div role="table" aria-label="Your guesses" aria-busy={loading} className="wordle-table min-w-[48rem] space-y-1.5">
        <div role="row" className={`wordle-head ${GRID}`}>
          {COLUMNS.map((c) => (
            <div key={c} role="columnheader" className="px-1 pb-1 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:text-left">
              {c}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.ticker} role="row" className={`wordle-guess ${GRID}`}>
            <div
              role="rowheader"
              className={cn(
                'wordle-company flex min-h-14 flex-col justify-center rounded-lg border px-3',
                row.correct ? 'border-positive bg-positive/15' : 'bg-card',
              )}
            >
              <span className="wordle-mobile-label hidden" aria-hidden="true">Company</span>
              <span className="font-mono text-sm font-semibold">{row.ticker}</span>
              <span className="truncate text-[11px] text-muted-foreground">{row.name}</span>
            </div>
            {row.cells.map((cell, i) => (
              <Cell key={cell.key} cell={cell} index={i} />
            ))}
          </div>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <div key={`empty-${i}`} role="row" className={`wordle-empty ${GRID}`} aria-hidden="true">
            {COLUMNS.map((c) => (
              <div key={c} className={cn('min-h-14 rounded-lg border border-dashed', loading && i === 0 && 'animate-pulse bg-muted/40')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
