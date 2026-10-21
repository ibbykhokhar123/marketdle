import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <rect x="7" y="15" width="4" height="9" rx="1.2" className="fill-primary-foreground/55" />
      <rect x="14" y="10" width="4" height="14" rx="1.2" className="fill-primary-foreground/80" />
      <rect x="21" y="6" width="4" height="18" rx="1.2" className="fill-primary-foreground" />
      <path d="M8.5 13 15.5 8.5 22.5 4.5" strokeWidth="1.6" strokeLinecap="round" fill="none" className="stroke-primary-foreground/80" />
    </svg>
  )
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">Marketdle</span>
    </Link>
  )
}
