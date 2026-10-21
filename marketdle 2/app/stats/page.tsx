import { connection } from 'next/server'
import { etDate } from '@/lib/date'
import { StatsDashboard } from '@/components/dashboard/stats-dashboard'
export const metadata = { title: 'Your Statistics' }
export default async function StatsPage(){ await connection(); return <StatsDashboard today={etDate()}/> }
