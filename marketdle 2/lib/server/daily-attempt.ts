import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Set SESSION_SECRET in production so signatures survive restarts and multiple instances.
const secret = process.env.SESSION_SECRET || (globalThis as typeof globalThis & { bellwetherSecret?: string }).bellwetherSecret || randomBytes(32).toString('hex')
;(globalThis as typeof globalThis & { bellwetherSecret?: string }).bellwetherSecret = secret
interface Attempt { date: string; values: string[]; done: boolean }
function sign(value: string) { return createHmac('sha256', secret).update(value).digest('base64url') }
function decode(raw: string | undefined): Attempt | null {
  if (!raw) return null
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try { const value = JSON.parse(Buffer.from(payload, 'base64url').toString()); return typeof value.date === 'string' && Array.isArray(value.values) && value.values.every((v: unknown) => typeof v === 'string') ? value : null } catch { return null }
}
/** Validate one append-only daily sequence; exact retries remain idempotent. */
export async function dailyAttempt(game: string, date: string, values: string[], done: boolean): Promise<string | null> {
  const jar = await cookies()
  const name = `bw-${game}-${date}`
  const prior = decode(jar.get(name)?.value)
  if (prior?.date === date) {
    const same = JSON.stringify(values) === JSON.stringify(prior.values)
    if (same) return null
    if (prior.done) return 'This daily attempt is already complete. Your saved result is final; try Practice for another round.'
    if (values.length !== prior.values.length + 1 || !prior.values.every((v,i) => values[i] === v)) return 'Your daily progress is out of sync. Reload this page in the original browser tab.'
  } else if (values.length > 1 && game !== 'ranking') {
    return 'Daily guesses must be submitted one at a time.'
  }
  const payload = Buffer.from(JSON.stringify({date, values, done})).toString('base64url')
  jar.set(name, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60*60*48 })
  return null
}
export async function dailyValues(game: string, date: string): Promise<string[]> {
  const jar = await cookies(); const prior = decode(jar.get(`bw-${game}-${date}`)?.value)
  return prior?.date === date ? prior.values : []
}
