import { BookOpen, Lightbulb } from 'lucide-react'
import type { CompanyReveal as Reveal } from '@/lib/types'
import { formatBillions, formatCompact, formatPercent, formatPrice } from '@/lib/format'
import { PriceChart } from './price-chart'

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular">{value}</dd>
    </div>
  )
}

export function CompanyReveal({ company }: { company: Reveal }) {
  const m = company.metrics
  return (
    <section aria-labelledby="reveal-title" className="company-reveal overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
        <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 font-mono text-xs font-semibold text-primary">{company.ticker}</div>
        <div>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">The answer</p>
          <h2 id="reveal-title" className="mt-1 text-2xl font-semibold text-balance">
            {company.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-primary">{company.ticker}</span> · {company.exchange} · {company.hq}
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {company.sector} · {company.industry}
        </span>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <PriceChart data={company.series} height={200} label={`${company.name} five-year price chart`} />
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="size-4 text-primary" aria-hidden="true" /> What it does
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{company.description}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">How it makes money</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{company.howItMakesMoney}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Company background</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{company.history}</p>
          </div>
        </div>
        <div className="space-y-5 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-2">
            <Metric label="Market cap" value={formatBillions(m.marketCap)} />
            <Metric label="Share price" value={formatPrice(m.price)} />
            <Metric label="Revenue (TTM)" value={formatBillions(m.revenue)} />
            <Metric label="Net income" value={formatBillions(m.netIncome)} />
            <Metric label="P/E ratio" value={m.pe === null ? 'N/A' : m.pe.toFixed(0)} />
            <Metric label="Revenue growth" value={formatPercent(m.revenueGrowth)} />
            <Metric label="Employees" value={formatCompact(m.employees)} />
            <Metric label="Founded · Listed" value={`${company.founded} · ${company.ipoYear}`} />
          </dl>
          <div>
            <h3 className="text-sm font-semibold">Major products</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {company.products.map((p) => (
                <li key={p} className="rounded-md border px-2 py-1 text-xs">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gold">
              <Lightbulb className="size-4" aria-hidden="true" /> Did you know?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed">{company.fact}</p>
          </div>
        </div>
      </div>
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        Figures are an approximate demo snapshot as of Jun 30, 2025. Chart is an illustrative reconstruction.
      </p>
    </section>
  )
}
