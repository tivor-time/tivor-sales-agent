'use client'

import { useState } from 'react'
import { Check, X, Pencil, Bot, FileText, AlertTriangle } from 'lucide-react'
import { LANGUAGE_LABELS } from '@tradepilot/shared'
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

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{STEP_LABEL[draft.stepKind] ?? draft.stepKind}</Badge>
        <Badge variant="outline">{LANGUAGE_LABELS[draft.language] ?? draft.language}</Badge>
        <Badge variant="outline" className="gap-1">
          {draft.generatedByAi ? <Bot className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          {draft.generatedByAi ? 'AI' : 'Template'}
        </Badge>
        {draft.spamLevel !== 'low' && (
          <Badge variant={draft.spamLevel === 'high' ? 'destructive' : 'warning'} className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Spam risk: {draft.spamLevel}
          </Badge>
        )}
        {draft.toAddress && (
          <span className="ml-auto truncate text-xs text-muted-foreground">{draft.toAddress}</span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            aria-label="Body"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy || !subject.trim() || !body.trim()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm font-medium">{draft.subject}</div>
          <div className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            {draft.bodyText}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
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
  )
}
