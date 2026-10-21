import 'server-only'
import { seeded, shuffle } from '@/lib/rng'
import type { TriviaAnswer, TriviaQuestion } from '@/lib/types'
import { keyString, type PuzzleKey } from './common'

interface Item extends TriviaQuestion {
  answer: number
  explanation: string
}

const BANK: Item[] = [
  { id: 't01', topic: 'Terminology', difficulty: 1, prompt: 'What does "market capitalization" measure?', options: ['A company\u2019s annual sales', 'Share price × shares outstanding', 'Total cash on the balance sheet', 'Profit after taxes'], answer: 1, explanation: 'Market cap is the total market value of a company\u2019s shares: the share price multiplied by the number of shares outstanding.' },
  { id: 't02', topic: 'Terminology', difficulty: 1, prompt: 'A "bear market" usually refers to a decline of at least how much from a recent high?', options: ['5%', '10%', '20%', '50%'], answer: 2, explanation: 'A 10% drop is commonly called a correction; a 20% or larger decline is typically called a bear market.' },
  { id: 't03', topic: 'Indexes', difficulty: 1, prompt: 'Roughly how many companies are in the S&P 500?', options: ['100', '500', '1,000', '5,000'], answer: 1, explanation: 'The S&P 500 tracks about 500 large U.S. companies (slightly more than 500 share classes) selected by a committee.' },
  { id: 't04', topic: 'Terminology', difficulty: 1, prompt: 'What is a dividend?', options: ['A loan to shareholders', 'A portion of profits paid to shareholders', 'A fee charged by brokers', 'A type of bond'], answer: 1, explanation: 'Dividends are cash (or stock) payments a company distributes to shareholders, usually from profits.' },
  { id: 't05', topic: 'Exchanges', difficulty: 1, prompt: 'What does "IPO" stand for?', options: ['Initial Public Offering', 'Internal Profit Order', 'Indexed Price Option', 'Investor Purchase Obligation'], answer: 0, explanation: 'An Initial Public Offering is when a private company first sells shares to the public on a stock exchange.' },
  { id: 't06', topic: 'Indexes', difficulty: 2, prompt: 'The NASDAQ-100 excludes companies from which sector?', options: ['Technology', 'Healthcare', 'Financials', 'Consumer discretionary'], answer: 2, explanation: 'The NASDAQ-100 includes the 100 largest non-financial companies listed on Nasdaq, so banks and other financial firms are excluded.' },
  { id: 't07', topic: 'Terminology', difficulty: 2, prompt: 'A P/E ratio of 25 means investors are paying…', options: ['$25 per share', '$25 for every $1 of annual earnings', '25% of revenue', '25 times the dividend'], answer: 1, explanation: 'Price-to-earnings divides the share price by earnings per share; a P/E of 25 means $25 of price for each $1 of annual profit.' },
  { id: 't08', topic: 'History', difficulty: 2, prompt: 'On "Black Monday" in October 1987, the Dow fell by roughly how much in a single day?', options: ['8%', '15%', '22%', '35%'], answer: 2, explanation: 'On October 19, 1987, the Dow Jones Industrial Average fell about 22.6%, still the largest one-day percentage drop in its history.' },
  { id: 't09', topic: 'Investors', difficulty: 2, prompt: 'Which investor is known as the "Oracle of Omaha"?', options: ['Peter Lynch', 'Warren Buffett', 'Charlie Munger', 'John Bogle'], answer: 1, explanation: 'Warren Buffett, chairman of Berkshire Hathaway, is based in Omaha, Nebraska and famous for long-term value investing.' },
  { id: 't10', topic: 'Investors', difficulty: 2, prompt: 'Who founded Vanguard and popularized low-cost index funds?', options: ['John Bogle', 'Ray Dalio', 'Benjamin Graham', 'Jack Welch'], answer: 0, explanation: 'John "Jack" Bogle launched the first index mutual fund for individual investors in 1976.' },
  { id: 't11', topic: 'Financial statements', difficulty: 2, prompt: 'Which financial statement shows a company\u2019s assets, liabilities, and shareholders\u2019 equity?', options: ['Income statement', 'Cash flow statement', 'Balance sheet', 'Proxy statement'], answer: 2, explanation: 'The balance sheet is a snapshot of what a company owns (assets), owes (liabilities), and the residual value for owners (equity).' },
  { id: 't12', topic: 'Financial statements', difficulty: 2, prompt: '"Revenue minus cost of goods sold" equals…', options: ['Net income', 'Gross profit', 'Free cash flow', 'EBITDA'], answer: 1, explanation: 'Gross profit is what remains after subtracting the direct costs of producing goods or services from revenue.' },
  { id: 't13', topic: 'Acquisitions', difficulty: 2, prompt: 'Which company acquired Activision Blizzard in 2023 for about $69 billion?', options: ['Sony', 'Microsoft', 'Amazon', 'Tencent'], answer: 1, explanation: 'Microsoft closed its ~$69B purchase of the video-game publisher in October 2023 after a long regulatory review.' },
  { id: 't14', topic: 'IPOs', difficulty: 3, prompt: 'Which company\u2019s 2014 NYSE IPO raised about $25 billion, a record at the time?', options: ['Facebook', 'Alibaba', 'Uber', 'Saudi Aramco'], answer: 1, explanation: 'Alibaba\u2019s September 2014 IPO raised roughly $25B, then the largest IPO ever; Saudi Aramco surpassed it in 2019 on the Saudi exchange.' },
  { id: 't15', topic: 'History', difficulty: 3, prompt: 'In which year did the Nasdaq Composite peak during the dot-com bubble before falling nearly 80%?', options: ['1997', '2000', '2002', '2007'], answer: 1, explanation: 'The Nasdaq Composite peaked in March 2000 above 5,000 and did not reclaim that level until 2015.' },
  { id: 't16', topic: 'Companies', difficulty: 3, prompt: 'Which company became the first U.S. company to close above a $3 trillion market value, in 2023?', options: ['Microsoft', 'Apple', 'NVIDIA', 'Alphabet'], answer: 1, explanation: 'Apple first closed above $3 trillion on June 30, 2023 (it briefly touched the level intraday in January 2022).' },
  { id: 't17', topic: 'Terminology', difficulty: 3, prompt: 'What does a stock\u2019s "beta" of 1.5 suggest?', options: ['It pays a 1.5% dividend', 'It tends to move about 1.5× as much as the market', 'It has 1.5× more debt than equity', 'It trades 1.5 million shares per day'], answer: 1, explanation: 'Beta measures sensitivity to market moves. A beta of 1.5 implies the stock historically moved ~50% more than the benchmark.' },
  { id: 't18', topic: 'Exchanges', difficulty: 3, prompt: 'The New York Stock Exchange traces its origin to an agreement signed under what kind of tree?', options: ['Oak', 'Buttonwood', 'Maple', 'Elm'], answer: 1, explanation: 'The Buttonwood Agreement of 1792 was signed by 24 brokers beneath a buttonwood (sycamore) tree on Wall Street.' },
  { id: 't19', topic: 'Earnings', difficulty: 3, prompt: 'If a company "beats on EPS," what has it done?', options: ['Paid a special dividend', 'Reported earnings per share above analyst estimates', 'Increased its share count', 'Met its revenue guidance exactly'], answer: 1, explanation: 'An EPS beat means reported earnings per share exceeded the consensus analyst forecast for the quarter.' },
  { id: 't20', topic: 'Financial statements', difficulty: 3, prompt: 'Free cash flow is most commonly calculated as…', options: ['Net income + dividends', 'Operating cash flow − capital expenditures', 'Revenue − total expenses', 'Cash − debt'], answer: 1, explanation: 'Free cash flow is cash generated by operations minus investment in property and equipment — the cash available to return or reinvest.' },
  { id: 't21', topic: 'History', difficulty: 4, prompt: 'Which stock index was created in 1896 with just 12 companies?', options: ['S&P 500', 'Dow Jones Industrial Average', 'Nasdaq Composite', 'Russell 2000'], answer: 1, explanation: 'Charles Dow launched the Dow Jones Industrial Average in May 1896 with 12 industrial companies. General Electric was the longest-lasting original member.' },
  { id: 't22', topic: 'Acquisitions', difficulty: 4, prompt: 'The 2000 merger of AOL and which company is often cited as one of the worst deals in history?', options: ['Viacom', 'Time Warner', 'Yahoo', 'Comcast'], answer: 1, explanation: 'AOL\u2019s ~$165B merger with Time Warner was followed by the dot-com crash and a ~$99B write-down in 2002.' },
  { id: 't23', topic: 'Terminology', difficulty: 4, prompt: 'What is a "short squeeze"?', options: ['A forced dividend cut', 'A rapid price rise as short sellers rush to buy back shares', 'An exchange trading halt', 'A bond maturing early'], answer: 1, explanation: 'When a heavily shorted stock rises, short sellers buy to cover losses, which pushes the price even higher — as seen with GameStop in January 2021.' },
  { id: 't24', topic: 'Investors', difficulty: 4, prompt: 'Benjamin Graham, Buffett\u2019s mentor, wrote which classic investing book?', options: ['A Random Walk Down Wall Street', 'The Intelligent Investor', 'One Up on Wall Street', 'Common Stocks and Uncommon Profits'], answer: 1, explanation: 'Graham published "The Intelligent Investor" in 1949, introducing ideas like "Mr. Market" and margin of safety.' },
  { id: 't25', topic: 'Indexes', difficulty: 4, prompt: 'The S&P 500 is weighted primarily by…', options: ['Share price', 'Equal weight', 'Float-adjusted market capitalization', 'Revenue'], answer: 2, explanation: 'S&P 500 weights are based on float-adjusted market cap, so the largest companies have the biggest influence. The Dow, by contrast, is price-weighted.' },
  { id: 't26', topic: 'Earnings', difficulty: 4, prompt: 'A company with negative net income has what kind of P/E ratio?', options: ['Zero', 'Negative and usually reported as "N/A"', 'Infinite', 'Equal to its dividend yield'], answer: 1, explanation: 'With losses, earnings per share is negative, so the P/E is not meaningful and is typically shown as N/A.' },
]

const PICKS_BY_DIFFICULTY: (1 | 2 | 3 | 4)[] = [1, 2, 2, 3, 4]

function pickQuestions(key: PuzzleKey): Item[] {
  const rand = seeded(keyString('trivia', key))
  const used = new Set<string>()
  return PICKS_BY_DIFFICULTY.map((d) => {
    const options = shuffle(
      BANK.filter((q) => q.difficulty === d && !used.has(q.id)),
      rand,
    )
    const chosen = options[0]
    used.add(chosen.id)
    return chosen
  })
}

export function triviaQuestions(key: PuzzleKey): TriviaQuestion[] {
  return pickQuestions(key).map(({ id, prompt, options, difficulty, topic }) => ({ id, prompt, options, difficulty, topic }))
}

export function answerTrivia(key: PuzzleKey, id: string, choice: number): TriviaAnswer | { error: string } {
  const q = pickQuestions(key).find((item) => item.id === id)
  if (!q) return { error: 'Question is not part of this puzzle' }
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return { error: 'Invalid choice' }
  const correct = choice === q.answer
  return { correct, answerIndex: q.answer, explanation: q.explanation, points: correct ? q.difficulty * 50 : 0 }
}
