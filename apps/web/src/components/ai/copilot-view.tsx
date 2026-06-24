'use client'

import { useEffect, useRef } from 'react'
import { Bot, Inbox, Mail, Send, Sparkles, Users } from 'lucide-react'
import { useFlags } from '@/lib/flags-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/empty-state'
import { MarkdownMessage } from './markdown-message'
import { useCopilotChat, type CopilotMsg } from './use-copilot-chat'

const SUGGESTION_CARDS = [
  { icon: Users, label: 'Top leads', prompt: 'Who are my top leads right now?' },
  { icon: Inbox, label: 'New replies', prompt: 'Summarize any new replies in my inbox.' },
  { icon: Mail, label: 'Draft an intro', prompt: 'Draft an intro email to my best lead.' },
]

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
    </span>
  )
}

function AssistantAvatar() {
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
      <Sparkles className="h-4 w-4" />
    </div>
  )
}

function Bubble({ msg }: { msg: CopilotMsg }) {
  if (msg.role === 'assistant') {
    return (
      <div className="flex gap-3">
        <AssistantAvatar />
        <div className="max-w-[80%] rounded-xl rounded-tl-sm border bg-card px-4 py-3 shadow-sm">
          <MarkdownMessage content={msg.content} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
        {msg.content}
      </div>
    </div>
  )
}

export function CopilotView() {
  const flags = useFlags()
  const { messages, input, setInput, loading, send } = useCopilotChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  if (!flags.isAiEnabled) {
    return (
      <EmptyState
        icon={Bot}
        title="AI is not configured"
        description="Set OPENAI_API_KEY to enable the copilot."
      />
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto scrollbar-thin p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <div className="space-y-8 pt-8 sm:pt-12">
              <div className="flex flex-col items-center text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sales Copilot</h1>
                <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                  Search your leads, read your inbox, and draft &amp; send emails — just ask.
                </p>
              </div>
              <div>
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Try asking
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {SUGGESTION_CARDS.map((s) => {
                    const Icon = s.icon
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => send(s.prompt)}
                        className="group flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                      >
                        <span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-foreground">{s.label}</span>
                        <span className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.prompt}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
              {loading && (
                <div className="flex gap-3">
                  <AssistantAvatar />
                  <div className="rounded-xl rounded-tl-sm border bg-card px-4 py-2.5 shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background p-3 sm:p-4">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-2 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/40">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              placeholder="Ask the copilot, or tell it who to email…"
              rows={1}
              className="max-h-40 min-h-[40px] resize-none border-0 bg-transparent px-2 py-2 shadow-none hover:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => void send(input)}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 px-1 text-center text-[11px] text-muted-foreground">
            <kbd className="font-sans font-medium text-foreground/70">Enter</kbd> to send ·{' '}
            <kbd className="font-sans font-medium text-foreground/70">Shift+Enter</kbd> for a new line
          </p>
        </div>
      </div>
    </div>
  )
}
