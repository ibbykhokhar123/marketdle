'use client'

import { useId } from 'react'
import { Area, AreaChart, Brush, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PricePoint } from '@/lib/types'
import { formatPrice } from '@/lib/format'

interface PriceChartProps {
  data: PricePoint[]
  height?: number
  zoomable?: boolean
  showAxes?: boolean
  label: string
}

const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const shortDayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function PriceChart({ data, height = 280, zoomable = false, showAxes = true, label }: PriceChartProps) {
  const id = useId().replace(/:/g, '')
  if (data.length === 0) return null
  const first = data[0].close
  const last = data[data.length - 1].close
  const shortRange = Date.parse(data[data.length - 1].date) - Date.parse(data[0].date) < 60 * 86_400_000
  const up = last >= first
  const color = up ? 'var(--color-positive)' : 'var(--color-negative)'
  const change = ((last - first) / first) * 100

  return (
    <figure className="price-chart w-full">
      <figcaption className="sr-only">
        {label}. Price moved {change >= 0 ? 'up' : 'down'} {Math.abs(change).toFixed(1)}% over the period shown, from{' '}
        {formatPrice(first)} to {formatPrice(last)}.
      </figcaption>
      <div style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="date"
              hide={!showAxes}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
              tickFormatter={(d: string) => (shortRange ? shortDayFmt : monthFmt).format(new Date(`${d}T00:00:00Z`))}
            />
            <YAxis
              hide={!showAxes}
              domain={['auto', 'auto']}
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-muted-foreground)', strokeDasharray: '3 3' }}
              contentStyle={{
                background: 'var(--color-popover)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--color-muted-foreground)' }}
              itemStyle={{ color: 'var(--color-foreground)' }}
              labelFormatter={(d) => dayFmt.format(new Date(`${d}T00:00:00Z`))}
              formatter={(v) => [formatPrice(Number(v)), 'Close']}
            />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill={`url(#fill-${id})`} isAnimationActive={false} />
            {zoomable && data.length > 40 && (
              <Brush
                dataKey="date"
                height={24}
                travellerWidth={8}
                stroke="var(--color-muted-foreground)"
                fill="var(--color-muted)"
                tickFormatter={() => ''}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
