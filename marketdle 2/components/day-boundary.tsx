'use client'
import { useEffect } from 'react'
import { etDate } from '@/lib/date'
export function DayBoundary(){
 useEffect(()=>{const day=etDate(); const check=()=>{if(etDate()!==day) window.location.reload()}; const interval=setInterval(check,1000);document.addEventListener('visibilitychange',check);return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',check)}},[])
 return null
}
