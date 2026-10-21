import { dailyAttempt } from '@/lib/server/daily-attempt'
import { badRequest, parsePuzzleKey } from '@/lib/server/common'
import { scoreRanking } from '@/lib/server/ranking'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('Invalid JSON')
  const key = parsePuzzleKey(body)
  if (!key) return badRequest('Invalid or unavailable puzzle')
  if (!Array.isArray(body.order) || !body.order.every((v: unknown) => typeof v === 'string')) return badRequest('Invalid order')
  const order: string[] = body.order
  const result = scoreRanking(key, order)
  if ('error' in result) return badRequest(result.error)
  if (key.kind === 'daily') {
    const error = await dailyAttempt('ranking', key.date, order, true)
    if (error) return badRequest(error)
  }
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
