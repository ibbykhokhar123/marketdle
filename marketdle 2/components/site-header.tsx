'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Flame, Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useHydrated, useStore } from '@/lib/client/store'
import { computeStats } from '@/lib/stats'
import { etDate } from '@/lib/date'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/play/wordle', label: 'Wordle' },
  { href: '/play/higher-lower', label: 'Higher/Lower' },
  { href: '/play/chart', label: 'Chart' },
  { href: '/play/ranking', label: 'Ranking' },
  { href: '/play/trivia', label: 'Trivia' },
  { href: '/stats', label: 'Stats' },
  { href: '/leaderboard', label: 'Scores' },
]

function StreakPill() {
  const state = useStore()
  const hydrated = useHydrated()
  const streak = hydrated ? computeStats(state, etDate()).currentStreak : 0
  return (
    <Link
      href="/stats"
      className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-sm font-medium text-gold tabular"
      aria-label={`Current streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
    >
      <Flame className="size-4" aria-hidden="true" />
      {streak}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.querySelector<HTMLButtonElement>('[aria-controls="mobile-nav"]')?.focus() } }} className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  active && 'bg-muted text-foreground',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <StreakPill />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t px-4 py-3 lg:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm hover:bg-muted',
                    (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) ? 'bg-muted font-medium' : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
