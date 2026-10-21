export function formatBillions(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 1 : 2)}T`
  if (abs >= 1) return `${sign}$${abs.toFixed(abs >= 100 ? 0 : 1)}B`
  return `${sign}$${(abs * 1000).toFixed(0)}M`
}

export function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatInteger(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return value.toLocaleString('en-US')
}

export function formatCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `${value > 0 ? '+' : ''}${value.toFixed(0)}%`
}

export function formatRatio(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `${value.toFixed(1)}x`
}
