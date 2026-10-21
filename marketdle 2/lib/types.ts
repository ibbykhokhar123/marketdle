export type GameMode = 'wordle' | 'hl' | 'chart' | 'ranking' | 'trivia'

export interface UniverseEntry {
  ticker: string
  name: string
  exchange: string
  aliases?: string[]
}

export interface PricePoint {
  date: string
  close: number
}

export type ChartRange = '1M' | '6M' | '1Y' | '5Y'

export interface CompanyMetrics {
  marketCap: number
  price: number | null
  pe: number | null
  revenue: number | null
  netIncome: number | null
  revenueGrowth: number | null
  employees: number | null
}

export interface CompanyReveal {
  ticker: string
  name: string
  exchange: string
  sector: string
  industry: string
  country: string
  hq: string
  ipoYear: number | 'N/A'
  founded: number | 'N/A'
  description: string
  howItMakesMoney: string
  products: string[]
  fact: string
  history: string
  metrics: CompanyMetrics
  series: PricePoint[]
}

export type CellStatus = 'correct' | 'close' | 'wrong'
export type Direction = 'up' | 'down' | null

export interface FeedbackCell {
  key: 'sector' | 'industry' | 'marketCap' | 'price' | 'pe' | 'country' | 'ipoYear'
  label: string
  display: string
  status: CellStatus
  direction: Direction
  directionLabel?: string
}

export interface WordleRow {
  ticker: string
  name: string
  correct: boolean
  cells: FeedbackCell[]
}

export type WordleHint =
  | { kind: 'text'; title: string; body: string }
  | { kind: 'chart'; title: string; series: PricePoint[] }

export type GameStatus = 'playing' | 'won' | 'lost'

export interface WordleResponse {
  puzzleId: string
  rows: WordleRow[]
  hints: WordleHint[]
  status: GameStatus
  maxGuesses: number
  reveal: CompanyReveal | null
  asOf: string
}

export interface ChartGuess {
  ticker: string
  name: string
  correct: boolean
  sameSector: boolean
}

export interface ChartResponse {
  puzzleId: string
  status: GameStatus
  maxGuesses: number
  guesses: ChartGuess[]
  clues: { title: string; body: string }[]
  ranges: Partial<Record<ChartRange, PricePoint[]>>
  lockedRanges: ChartRange[]
  reveal: CompanyReveal | null
}

export type HlMetricKey = keyof CompanyMetrics
export type HlDifficulty = 'standard' | 'beginner' | 'expert'

export interface HlRound {
  index: number
  metric: { key: HlMetricKey; label: string; question: string; unitNote: string }
  left: UniverseEntry & { display: string }
  right: UniverseEntry
  asOf: string
}

export interface HlAnswer {
  correct: boolean
  rightDisplay: string
  differenceDisplay: string
  explanation: string
}

export interface RankingCompany extends UniverseEntry {
  sector: string
}

export interface RankingResult {
  points: number
  correctCount: number
  results: {
    ticker: string
    name: string
    marketCapDisplay: string
    correctIndex: number
    yourIndex: number
  }[]
  asOf: string
}

export interface TriviaQuestion {
  id: string
  prompt: string
  options: string[]
  difficulty: 1 | 2 | 3 | 4
  topic: string
}

export interface TriviaAnswer {
  correct: boolean
  answerIndex: number
  explanation: string
  points: number
}
