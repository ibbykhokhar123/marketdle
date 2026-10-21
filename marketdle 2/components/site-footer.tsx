import Link from 'next/link'
import { LogoMark } from '@/components/logo'

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-xl items-start gap-3">
          <LogoMark className="size-6 shrink-0" />
          <p className="text-pretty leading-relaxed">
            Marketdle is an educational game. Company figures are an approximate demo snapshot as of June 30, 2025 and
            charts are illustrative reconstructions — not live market data and not investment advice. Company names and
            tickers belong to their respective owners.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/play/wordle" className="hover:text-foreground">Play</Link>
          <Link href="/stats" className="hover:text-foreground">Statistics</Link>
          <Link href="/about" className="hover:text-foreground">About &amp; Data</Link>
          <Link href="/leaderboard" className="hover:text-foreground">Scores</Link>
        </nav>
      </div>
    </footer>
  )
}
