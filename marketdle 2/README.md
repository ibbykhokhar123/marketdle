# Marketdle

A complete, local Next.js demo of a daily financial puzzle platform, built from the supplied stock-market-guessing-game archive.

## Run

Requires Node.js 20.9 or later and pnpm.

```sh
pnpm install
cp .env.example .env.local
# Replace SESSION_SECRET with a random secret, at least 32 characters.
pnpm dev
```

Open http://localhost:3000. A unique local SESSION_SECRET was already generated in this workspace; keep it private. It is not included in the source ZIP.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

The dev/build scripts use Webpack because this desktop sandbox blocks Turbopack's internal port binding. The app runs on standard Next.js Node hosting. Production requires HTTPS for secure cookies and the same SESSION_SECRET on every server instance.

## What's playable

- Stock Wordle: six company guesses with seven metric comparisons, progressive hints, educational reveal, and spoiler-free sharing.
- Higher or Lower: ten daily comparisons, automatic advance with an opt-out, plus endless practice at three difficulty levels. All seven requested metrics are covered across difficulty levels.
- Guess the Chart: five guesses, timeframe selection, unlockable five-year chart, clues and a zoom brush.
- Market Cap Ranking: five companies, drag or keyboard-accessible move buttons, saved unfinished order, position scoring and result reveal.
- Market Trivia: five deterministic questions, explanations, answer review, difficulty-weighted points and practice.
- Original dashboard, daily progress, streaks, statistics charts, achievements, personal scoreboard, theme switcher and data/instructions page.

## Data, privacy, and limits

**All financial figures are approximate demo fixtures dated June 30, 2025. Charts are illustrative reconstructions from hand-authored anchors; they are not verified historical quotes. No live market API, authentication, shared leaderboard, database, or cross-device synchronization is connected.**

The company dataset lives in `lib/server/companies.ts`, protected by `server-only`. The frontend receives a searchable universe of names/tickers, permitted clues, and only the post-game answer reveal. Metric units and snapshot dates appear throughout the UI. Company marks are original ticker monograms; no proprietary logos are required. Educational company background and trivia are curated demo content, not a verified research feed.

The permitted no-API demo path is implemented. A future live-data integration should fetch and normalize a complete dated snapshot on the server before a puzzle date starts, persist it immutably, and make every game for that date use that same version. Do not fetch mutable live prices directly into scoring: doing so would give players different daily answers. Validate units, fiscal period, licensing, split adjustments, and source dates before enabling a feed.

Daily puzzle IDs and selections depend on the Eastern calendar date and game mode. Reset countdowns handle daylight-saving changes, and an open page refreshes when the Eastern date changes. Yesterday's API puzzle can still be evaluated for an in-flight request at midnight.

Guest progress and statistics save in localStorage (`bellwether:v1`). Signed HTTP-only cookies enforce an append-only answer sequence for each daily mode in the current browser. Exact retries are idempotent; changing an answer, skipping guesses or resubmitting a completed order is rejected. Cookies are scoped per game. Clearing storage/cookies, switching browsers, or replaying old cookie values can bypass anonymous identity constraints; this is **not** an account-backed competitive anti-cheat system. Strong public rankings need a durable server-side attempt ledger, authenticated identities, transaction/locking rules and rate limits. The scoreboard truthfully shows personal browser results only.

No analytics or third-party tracking is enabled. Secrets belong only in server environment variables. The included `.env.example` contains no real credentials. Do not ship `.env.local`.

## Validation

`pnpm test` runs 14 focused suites against the real TypeScript game modules and API route handlers, including:

- Eastern midnight and 23/25-hour DST reset days.
- Deterministic selection and pre-result answer redaction.
- Wordle win/loss, directional feedback, hints, duplicates, unknown guesses and limits.
- Chart win/loss and range unlocks.
- 180 higher/lower matchups across all difficulties, checking valid unequal metrics and both answer directions.
- Ranking correctness, trivia validation, scoring, streaks and statistics.
- Daily sequence integrity and API rejection of answer fishing, skipped rounds and changed answers.

Production compilation and strict TypeScript checks are enabled. Browser QA covers company search/keyboard entry, refresh persistence, a complete daily higher/lower session, ranking controls, trivia feedback, chart selection, and statistics.

## Stock coverage expansion — October 20, 2026

The universe now contains **568 stocks (520 additions, all 48 original records preserved)**. This update adds sourced Nasdaq snapshots alongside the original demo fixtures. Existing daily challenges are frozen; expanded daily selection begins October 21, 2026, and practice uses it immediately. See [the complete preservation and verification report](STOCK-EXPANSION-REPORT.md) for the 163-company over-$100B audit, source dates, incomplete fields, and reproduction commands.
