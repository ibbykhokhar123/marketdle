'use client'

import { useEffect, useState } from 'react'
import { msUntilNextReset } from '@/lib/date'

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function Countdown({ className }: { className?: string }) {
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setMs(msUntilNextReset())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={className} suppressHydrationWarning>
      <span className="font-mono tabular">{ms === null ? '--:--:--' : format(ms)}</span>
    </span>
  )
}
