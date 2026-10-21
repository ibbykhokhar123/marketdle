import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { DayBoundary } from '@/components/day-boundary'
import './globals.css'


export const metadata: Metadata = {
  applicationName: 'Marketdle',
  title: {
    default: 'Marketdle',
    template: '%s · Marketdle',
  },
  description:
    'Marketdle is a daily stock market guessing game where players test their financial knowledge through stock puzzles, market cap comparisons, and interactive challenges.',
  keywords: ['stock market game', 'stock wordle', 'finance trivia', 'higher or lower stocks', 'investing game', 'daily puzzle'],
  openGraph: {
    siteName: 'Marketdle',
    title: 'Marketdle — Guess the Stock. Beat the Market.',
    description: 'Marketdle is a daily stock market guessing game where players test their financial knowledge through stock puzzles, market cap comparisons, and interactive challenges.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Marketdle — Guess the Stock. Beat the Market.',
    description: 'Marketdle is a daily stock market guessing game where players test their financial knowledge through stock puzzles, market cap comparisons, and interactive challenges.',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fb' },
    { media: '(prefers-color-scheme: dark)', color: '#111318' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <div className="flex min-h-dvh flex-col">
            <DayBoundary />
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
