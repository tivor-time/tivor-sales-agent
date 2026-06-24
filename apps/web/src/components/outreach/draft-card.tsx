'use client'

import { useState } from 'react'
import { Check, X, Pencil, Bot, FileText, AlertTriangle, ArrowRight } from 'lucide-react'
import { LANGUAGE_LABELS } from '@tradepilot/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useApproveDraft, useRejectDraft, useEditDraft } from '@/lib/query/outreach'
import type { DraftMessageDTO } from '@/server/outreach/dto'

const STEP_LABEL: Record<string, string> = {
  intro: 'Intro · Day 1',
  follow_up: 'Follow-up · Day 3',
  value: 'Value · Day 7',
  breakup: 'Breakup · Day 14',
}

export function DraftCard({ draft }: { draft: DraftMessageDTO }) {
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.bodyText)

  const approve = useApproveDraft()
  const reject = useRejectDraft()
  const edit = useEditDraft()
  const busy = approve.isPending || reject.isPending || edit.isPending

  function save() {
    edit.mutate(
      { id: draft.id, subject: subject.trim(), bodyText: body.trim() },
      { onSuccess: () => setEditing(false) },
    )
  }

  const isHigh = draft.spamLevel === 'high'
  const isMedium = draft.spamLevel === 'medium'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md',
        isHigh && 'border-l-2 border-l-destructive',
        isMedium && 'border-l-2 border-l-warning',
      )}
    >
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
        <Badge variant="secondary">{STEP_LABEL[draft.stepKind] ?? draft.stepKind}</Badge>
        <Badge variant="outline">{LANGUAGE_LABELS[draft.language] ?? draft.language}</Badge>
        <Badge variant="outline" className="gap-1">
          {draft.generatedByAi ? <Bot className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          {draft.generatedByAi ? 'AI' : 'Template'}
        </Badge>
        {draft.spamLevel !== 'low' && (
          <Badge variant={isHigh ? 'destructive' : 'warning'} className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Spam risk: {draft.spamLevel}
          </Badge>
        )}
      </div>

      <div className="p-5">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor={`subject-${draft.id}`}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Subject
              </label>
              <Input
                id={`subject-${draft.id}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="Subject"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`body-${draft.id}`}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Message
              </label>
              <Textarea
                id={`body-${draft.id}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                aria-label="Body"
                className="font-mono text-sm leading-relaxed"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={busy || !subject.trim() || !body.trim()}>
                Save changes
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Recipient line */}
            {draft.toAddress && (
              <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-wide">To</span>
                <ArrowRight className="h-3 w-3" />
                <span className="truncate font-medium text-foreground/80">{draft.toAddress}</span>
              </div>
            )}

            {/* Subject */}
            <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground">
              {draft.subject}
            </h3>

            {/* Body */}
            <div className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed text-foreground/80 scrollbar-thin">
              {draft.bodyText}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={busy}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reject.mutate({ id: draft.id })}
                disabled={busy}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button size="sm" onClick={() => approve.mutate({ id: draft.id })} disabled={busy}>
                <Check className="h-4 w-4" /> Approve
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
