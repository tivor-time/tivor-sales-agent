'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, Inbox, Mail, Maximize2, Send, Sparkles, Users, X } from 'lucide-react'
import { useFlags } from '@/lib/flags-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownMessage } from './markdown-message'
import { useCopilotChat, type CopilotMsg } from './use-copilot-chat'

const SUGGESTIONS = [
  { icon: Users, prompt: 'Who are my top leads?' },
  { icon: Inbox, prompt: 'Any new replies in my inbox?' },
  { icon: Mail, prompt: 'Draft an intro email to my best lead' },
]

function AssistantAvatar() {
  return (
    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
      <Sparkles className="h-3.5 w-3.5" />
    </div>
  )
}

function Bubble({ msg }: { msg: CopilotMsg }) {
  if (msg.role === 'assistant') {
    return (
      <div className="flex gap-2">
        <AssistantAvatar />
        <div className="max-w-[85%] rounded-xl rounded-tl-sm border bg-background px-3 py-2 shadow-sm">
          <MarkdownMessage content={msg.content} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground shadow-sm">
        {msg.content}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-2">
      <AssistantAvatar />
      <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border bg-background px-3 py-2.5 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
      </div>
    </div>
  )
}

export function CopilotWidget() {
  const flags = useFlags()
  const [open, setOpen] = useState(false)
  const { messages, input, setInput, loading, send } = useCopilotChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  if (!flags.isAiEnabled) return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI copilot"
        className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-inset ring-primary-foreground/10 transition-transform hover:scale-105 active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
      >
        <Bot className="h-6 w-6 transition-transform group-hover:rotate-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[560px] max-h-[calc(100svh-2.5rem)] w-[calc(100vw-2.5rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
            <Sparkles className="h-4 w-4" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Sales Copilot</p>
            <p className="text-[11px] text-muted-foreground">Find leads · read inbox · draft &amp; send</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Link
            href="/copilot"
            onClick={() => setOpen(false)}
            aria-label="Open full screen"
            title="Open full screen"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close copilot"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-auto scrollbar-thin bg-background p-4">
        {messages.length === 0 ? (
          <div className="space-y-4 pt-1">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ask me to find leads, summarize replies, or draft and send an email.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.prompt}
                    type="button"
                    onClick={() => send(s.prompt)}
                    className="group flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left text-xs font-medium text-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {s.prompt}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} msg={m} />)
        )}
        {loading && <TypingDots />}
      </div>

      <div className="border-t bg-card p-3">
        <div className="flex items-end gap-2 rounded-xl border border-input bg-background p-1.5 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/40">
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
            className="max-h-32 min-h-[36px] resize-none border-0 bg-transparent px-2 py-1.5 shadow-none hover:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
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
