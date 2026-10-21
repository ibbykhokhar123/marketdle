import { connection } from 'next/server'
import { HomeDashboard } from '@/components/dashboard/home-dashboard'
import { etDate, puzzleNumber, formatLongDate } from '@/lib/date'
export default async function Home() {
  await connection()
  const today = etDate()
  return <HomeDashboard today={today} number={puzzleNumber(today)} dateLabel={formatLongDate(today)} />
}
