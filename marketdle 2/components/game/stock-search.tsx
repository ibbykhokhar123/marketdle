'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { UniverseEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StockSearchProps {
  universe: UniverseEntry[]
  excluded?: string[]
  disabled?: boolean
  placeholder?: string
  onSelect: (ticker: string) => void
}

export function rank(entry: UniverseEntry, q: string): number {
  const normalized = q.replace(/[/-]/g, '.')
  const tickers = [entry.ticker, ...(entry.aliases ?? [])].map(t => t.toLowerCase().replace(/[/-]/g, '.'))
  const n = entry.name.toLowerCase()
  if (tickers.includes(normalized)) return 0
  if (tickers.some(ticker => ticker.startsWith(normalized))) return 1
  if (n.startsWith(q)) return 2
  if (n.split(/\s+/).some((w) => w.startsWith(q))) return 3
  if (n.includes(q)) return 4
  return -1
}

export function StockSearch({ universe, excluded = [], disabled, placeholder = 'Search ticker or company…', onSelect }: StockSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [listStyle, setListStyle] = useState<React.CSSProperties>()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return universe
      .filter((e) => !excluded.includes(e.ticker))
      .map((e) => ({ e, r: rank(e, q) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.e.name.localeCompare(b.e.name))
      .slice(0, 7)
      .map((x) => x.e)
  }, [query, universe, excluded])

  const choose = (entry: UniverseEntry | undefined) => {
    if (!entry) return
    onSelect(entry.ticker)
    setQuery('')
    setOpen(false)
    setActive(0)
    inputRef.current?.focus()
  }

  const showList = open && results.length > 0

  // Keep suggestions inside the visible phone screen when its keyboard opens.
  useEffect(() => {
    if (!open) return
    const placeList = () => {
      if (!window.matchMedia('(max-width: 1023px)').matches) {
        setListStyle(undefined)
        return
      }
      const input = inputRef.current
      if (!input) return
      const rect = input.getBoundingClientRect()
      const viewport = window.visualViewport
      const top = viewport?.offsetTop ?? 0
      const bottom = top + (viewport?.height ?? window.innerHeight)
      const below = Math.max(0, bottom - rect.bottom - 12)
      const above = Math.max(0, rect.top - Math.max(top, 56) - 12)
      const upward = below < 180 && above > below
      setListStyle({
        top: upward ? 'auto' : 'calc(100% + 8px)',
        bottom: upward ? 'calc(100% + 8px)' : 'auto',
        marginTop: 0,
        maxHeight: Math.min(320, upward ? above : below),
      })
    }
    placeList()
    window.addEventListener('resize', placeList)
    window.addEventListener('scroll', placeList, true)
    window.visualViewport?.addEventListener('resize', placeList)
    window.visualViewport?.addEventListener('scroll', placeList)
    return () => {
      window.removeEventListener('resize', placeList)
      window.removeEventListener('scroll', placeList, true)
      window.visualViewport?.removeEventListener('resize', placeList)
      window.visualViewport?.removeEventListener('scroll', placeList)
    }
  }, [open])

  return (
    <div className="stock-search relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search for a stock by ticker or company name
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={disabled ? 'Loading puzzle…' : placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((a) => Math.max(0, Math.min(a + 1, results.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            choose(results[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className="h-12 w-full rounded-xl border bg-card pr-4 pl-10 text-base shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {showList && (
        <ul id={listId} role="listbox" style={listStyle} className="absolute z-30 mt-2 max-h-80 w-full overflow-auto overscroll-contain rounded-xl border bg-popover p-1 shadow-xl">
          {results.map((entry, i) => (
            <li
              key={entry.ticker}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(entry)}
              className={cn('stock-option flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5', i === active && 'bg-muted')}
            >
              <span className="w-14 shrink-0 font-mono text-sm font-semibold text-primary">{entry.ticker}</span>
              <span className="truncate text-sm">{entry.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{entry.exchange}</span>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && (
        <p style={listStyle} className="absolute z-30 mt-2 w-full overflow-auto rounded-xl border bg-popover px-4 py-3 text-sm text-muted-foreground shadow-xl">
          No matching companies in this puzzle&apos;s universe.
        </p>
      )}
    </div>
  )
}
