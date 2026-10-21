import { connection } from 'next/server'
import { etDate } from '@/lib/date'
import { PersonalScores } from '@/components/dashboard/personal-scores'
export const metadata={title:'Scoreboard'}
export default async function LeaderboardPage(){await connection();return <PersonalScores today={etDate()}/>}
