import { dailyAttempt } from '@/lib/server/daily-attempt'
import { badRequest, parsePuzzleKey } from '@/lib/server/common'
import { evaluateChart } from '@/lib/server/chart'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('Invalid JSON')
  const key = parsePuzzleKey(body)
  if (!key) return badRequest('Invalid or unavailable puzzle')
  if (!Array.isArray(body.guesses) || !body.guesses.every((v: unknown) => typeof v === 'string')) return badRequest('Invalid guesses')
  const guesses: string[] = body.guesses
  const result = evaluateChart(key, guesses)
  if ('error' in result) return badRequest(result.error)
  if (key.kind === 'daily') {
    const error = await dailyAttempt('chart', key.date, guesses, result.status !== 'playing')
    if (error) return badRequest(error)
  }
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
