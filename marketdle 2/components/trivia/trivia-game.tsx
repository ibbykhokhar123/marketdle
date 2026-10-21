'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react'
import type { TriviaAnswer, TriviaQuestion } from '@/lib/types'
import { postJson } from '@/lib/client/use-guess-game'
import { saveRecord, useHydrated, useRecord, type GameRecord } from '@/lib/client/store'
import { GameHeader, newSeed } from '@/components/game/game-header'
import { ShareButton } from '@/components/game/share-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  questions: TriviaQuestion[]
  today: string
  number: number
  seed: string | null
}

type Answers = NonNullable<GameRecord['trivia']>
const LEVEL = ['', 'Warm-up', 'Easy', 'Medium', 'Hard'] as const
const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function TriviaGame({ questions, today, number, seed }: Props) {
  const router = useRouter()
  const hydrated = useHydrated()
  const record = useRecord('trivia', today)
  const mode = seed ? 'practice' : 'daily'
  const [practiceAnswers, setPracticeAnswers] = useState<Answers>({})
  const [viewing, setViewing] = useState<number | null>(null)
  const [pending, setPending] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const answers: Answers = mode === 'daily' ? (record?.trivia ?? {}) : practiceAnswers
  const answeredCount = questions.filter((q) => answers[q.id]).length
  const firstUnanswered = questions.findIndex((q) => !answers[q.id])
  const current = viewing ?? (firstUnanswered === -1 ? questions.length : firstUnanswered)
  const question = questions[current]
  const answer = question ? answers[question.id] : undefined
  const total = Object.values(answers).reduce((s, a) => s + a.points, 0)
  const correct = Object.values(answers).filter((a) => a.correct).length

  const choose = async (choice: number) => {
    if (!question || answer || pending !== null) return
    setPending(choice)
    setError(null)
    try {
      const res = await postJson<TriviaAnswer>(
        '/api/trivia',
        seed ? { mode: 'practice', seed, id: question.id, choice } : { mode: 'daily', date: today, id: question.id, choice },
      )
      const next: Answers = { ...answers, [question.id]: { choice, ...res } }
      setViewing(current)
      if (mode === 'daily') {
        const done = questions.every((q) => next[q.id])
        const nextCorrect = Object.values(next).filter((a) => a.correct).length
        saveRecord({
          mode: 'trivia',
          date: today,
          trivia: next,
          status: done ? (nextCorrect >= 3 ? 'won' : 'lost') : 'playing',
          points: Object.values(next).reduce((s, a) => s + a.points, 0),
          share: done
            ? `Marketdle Market Trivia #${number} ${nextCorrect}/${questions.length}\n${questions.map((q) => (next[q.id].correct ? '🟩' : '🟥')).join('')}`
            : undefined,
        })
      } else {
        setPracticeAnswers(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-8">
      <GameHeader
        puzzleLabel={mode === 'daily' ? `Daily quiz #${number}` : 'Practice · unlimited'}
        title="Market Trivia"
        subtitle="Five questions, rising difficulty. Harder questions are worth more points."
        mode={mode}
        onModeChange={(m) => router.push(m === 'daily' ? '/play/trivia' : `/play/trivia?practice=${newSeed()}`)}
      />

      <ol className="flex gap-1.5" aria-label={`${answeredCount} of ${questions.length} answered`}>
        {questions.map((q, i) => {
          const a = answers[q.id]
          return (
            <li key={q.id} className="flex-1">
              <button
                type="button"
                aria-label={`Question ${i + 1}${a ? (a.correct ? ', correct' : ', incorrect') : ''}`}
                aria-current={i === current ? 'step' : undefined}
                disabled={!a && i !== firstUnanswered}
                onClick={() => setViewing(i)}
                className={cn(
                  'h-1.5 w-full rounded-full transition-colors disabled:cursor-default',
                  a ? (a.correct ? 'bg-positive' : 'bg-negative') : 'bg-muted',
                  i === current && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              />
            </li>
          )
        })}
      </ol>

      {!hydrated ? (
        <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />
      ) : question ? (
        <section aria-labelledby="question" className="trivia-question rounded-2xl border bg-card p-5 md:p-7">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            <span>
              Question {current + 1} of {questions.length}
            </span>
            <span aria-hidden="true">·</span>
            <span>{question.topic}</span>
            <span className="ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-gold normal-case tracking-normal">
              {LEVEL[question.difficulty]} · {question.difficulty * 50} pts
            </span>
          </p>
          <h2 id="question" className="mt-3 text-xl font-semibold text-balance md:text-2xl">
            {question.prompt}
          </h2>
          <ul className="mt-6 grid gap-2">
            {question.options.map((opt, i) => {
              const isAnswer = answer && answer.answerIndex === i
              const isWrongPick = answer && answer.choice === i && !answer.correct
              return (
                <li key={opt}>
                  <button
                    type="button"
                    disabled={Boolean(answer) || pending !== null}
                    onClick={() => choose(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors enabled:hover:border-primary enabled:hover:bg-primary/5 disabled:cursor-default',
                      pending === i && 'animate-pulse border-primary',
                      isAnswer && 'border-positive bg-positive/10',
                      isWrongPick && 'border-negative bg-negative/10',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold',
                        isAnswer && 'border-transparent bg-positive text-positive-foreground',
                        isWrongPick && 'border-transparent bg-negative text-negative-foreground',
                      )}
                    >
                      {isAnswer ? <Check className="size-4" aria-hidden="true" /> : isWrongPick ? <X className="size-4" aria-hidden="true" /> : LETTERS[i]}
                    </span>
                    {opt}
                  </button>
                </li>
              )
            })}
          </ul>
          <div aria-live="polite">
            {error && <p className="mt-4 text-sm text-negative">{error}</p>}
            {answer && (
              <div className="mt-6 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={cn('font-semibold', answer.correct ? 'text-positive' : 'text-negative')}>
                    {answer.correct ? `Correct · +${answer.points}` : 'Incorrect'}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">{answer.explanation}</p>
                </div>
                <Button size="lg" className="shrink-0" onClick={() => setViewing(firstUnanswered === -1 ? questions.length : null)}>
                  {firstUnanswered === -1 ? 'See results' : 'Next question'} <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div role="status" className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{mode === 'daily' ? 'Daily quiz complete' : 'Practice round complete'}</p>
          <p className="mt-1 text-5xl font-semibold tabular">
            {correct}/{questions.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">+{total} points</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="lg" onClick={() => setViewing(0)}>
              Review answers
            </Button>
            {mode === 'daily' ? (
              record?.share && <ShareButton text={record.share} />
            ) : (
              <Button size="lg" onClick={() => router.push(`/play/trivia?practice=${newSeed()}`)}>
                <RotateCcw aria-hidden="true" /> New quiz
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
