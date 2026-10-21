'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { rebrandShareText } from '@/lib/branding'

export function ShareButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const resultText = `${rebrandShareText(text)}\n${window.location.origin}`
    try {
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text: resultText })
        return
      }
      await navigator.clipboard.writeText(resultText)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const area = document.createElement('textarea')
      area.value = resultText
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button onClick={share} className={className} size="lg">
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      {copied ? 'Copied to clipboard' : 'Share result'}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Result copied' : ''}
      </span>
    </Button>
  )
}
