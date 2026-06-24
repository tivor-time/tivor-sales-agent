'use client'

import { useState } from 'react'

export type CopilotMsg = { role: 'user' | 'assistant'; content: string }

export const COPILOT_SUGGESTIONS = [
  'Who are my top leads?',
  'Any new replies in my inbox?',
  'Draft an intro email to my best lead',
]

/** Shared copilot chat state + send loop, used by the floating widget and the full page. */
export function useCopilotChat() {
  const [messages, setMessages] = useState<CopilotMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return
    const next: CopilotMsg[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = (await res.json()) as { reply?: string }
      setMessages([...next, { role: 'assistant', content: data.reply || '(no response)' }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Network error — please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return { messages, input, setInput, loading, send }
}
