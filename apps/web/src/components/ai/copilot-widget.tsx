'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFlags } from '@/lib/flags-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Who are my top leads?',
  'Any new replies in my inbox?',
  'Draft an intro email to my best lead',
]

export function CopilotWidget() {
  const flags = useFlags()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  if (!flags.isAiEnabled) return null

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return
    const next: Msg[] = [...messages, { role: 'user', content }]
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI copilot"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Bot className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[560px] max-h-[calc(100svh-2.5rem)] w-[calc(100vw-2.5rem)] max-w-[400px] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Sales Copilot</p>
            <p className="text-[11px] text-muted-foreground">Find leads · read inbox · draft & send</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close copilot"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Ask me to find leads, summarize new replies, or draft and send an email.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-md border bg-muted/30 px-3 py-2 text-left text-xs hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-muted/40 text-foreground',
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send(input)
              }
            }}
            placeholder="Message the copilot…"
            rows={1}
            className="max-h-32 min-h-[40px] resize-none"
          />
          <Button
            size="icon"
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
