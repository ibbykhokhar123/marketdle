import { dailyAttempt, dailyValues } from '@/lib/server/daily-attempt'
import { triviaQuestions } from '@/lib/server/trivia'
import { badRequest, parsePuzzleKey } from '@/lib/server/common'
import { answerTrivia } from '@/lib/server/trivia'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return badRequest('Invalid JSON')
  const key = parsePuzzleKey(body)
  if (!key) return badRequest('Invalid or unavailable puzzle')
  if (typeof body.id !== 'string') return badRequest('Missing question id')
  const result = answerTrivia(key, body.id, Number(body.choice))
  if ('error' in result) return badRequest(result.error)
  if (key.kind === 'daily') {
    const previous = await dailyValues('trivia', key.date)
    const entry = `${body.id}:${body.choice}`
    const questions = triviaQuestions(key)
    const index = questions.findIndex(q => q.id === body.id)
    if (index > previous.length || (index < previous.length && previous[index] !== entry)) return badRequest('Answer daily questions in order. Submitted answers cannot be changed.')
    const values = index < previous.length ? previous : [...previous, entry]
    const error = await dailyAttempt('trivia', key.date, values, values.length === questions.length)
    if (error) return badRequest(error)
  }
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
