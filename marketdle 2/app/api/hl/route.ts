import { dailyAttempt, dailyValues } from '@/lib/server/daily-attempt'
import { badRequest, resolveDailyDate } from '@/lib/server/common'
import { HL_DAILY_ROUNDS, hlAnswer, hlRound } from '@/lib/server/hl'
import type { HlDifficulty } from '@/lib/types'

const DIFFICULTIES: HlDifficulty[] = ['standard', 'beginner', 'expert']

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('Invalid JSON')

  const index = Number(body.index)
  if (!Number.isInteger(index) || index < 0 || index > 10_000) return badRequest('Invalid round')

  let seedKey: string
  let difficulty: HlDifficulty
  if (body.mode === 'daily') {
    const date = resolveDailyDate(body.date)
    if (!date) return badRequest('Invalid or unavailable puzzle')
    if (index >= HL_DAILY_ROUNDS) return badRequest('Daily challenge has 10 rounds')
    seedKey = `hl:daily:${date}`
    difficulty = 'standard'
  } else {
    if (typeof body.seed !== 'string' || !/^[a-z0-9-]{4,40}$/i.test(body.seed)) return badRequest('Invalid seed')
    if (!DIFFICULTIES.includes(body.difficulty)) return badRequest('Invalid difficulty')
    seedKey = `hl:endless:${body.seed}`
    difficulty = body.difficulty
  }

  const round = hlRound(seedKey, index, difficulty)
  if (body.choice === 'higher' || body.choice === 'lower') {
    if (body.mode === 'daily') {
      const previous = await dailyValues('hl', body.date)
      if (index > previous.length || (index < previous.length && previous[index] !== body.choice)) return badRequest('Daily answers cannot be skipped or changed.')
      const values = index < previous.length ? previous : [...previous, body.choice]
      const error = await dailyAttempt('hl', body.date, values, values.length === HL_DAILY_ROUNDS)
      if (error) return badRequest(error)
    }
    return Response.json({ round, answer: hlAnswer(seedKey, index, difficulty, body.choice) }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return Response.json({ round }, { headers: { 'Cache-Control': 'no-store' } })
}
