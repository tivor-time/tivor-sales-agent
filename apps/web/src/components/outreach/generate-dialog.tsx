'use client'

import { useState, type ReactNode } from 'react'
import { Send, Sparkles, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGenerateDrafts } from '@/lib/query/outreach'

export function GenerateOutreachDialog({
  leadIds,
  onDone,
  children,
}: {
  leadIds: string[]
  onDone?: () => void
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const gen = useGenerateDrafts()
  const placeholder = `Outreach ${new Date().toISOString().slice(0, 10)}`

  function run() {
    const campaignName = name.trim() || placeholder
    gen.mutate(
      { name: campaignName, leadIds },
      {
        onSuccess: () => {
          setOpen(false)
          setName('')
          onDone?.()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4" /> Draft outreach
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogTitle>
            Draft outreach for{' '}
            <span className="tabular-nums">{leadIds.length}</span> lead
            {leadIds.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            Generates a localized 4-step sequence (Day 1 / 3 / 7 / 14) per lead, in each buyer’s
            language. Drafts go to the approval queue — nothing is sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="campaign-name">Campaign name</Label>
          <Input
            id="campaign-name"
            placeholder={placeholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the date as the campaign name.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium text-foreground tabular-nums">{leadIds.length}</span> lead
            {leadIds.length === 1 ? '' : 's'} selected ·{' '}
            <span className="font-medium text-foreground tabular-nums">{leadIds.length * 4}</span>{' '}
            drafts will be generated
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={gen.isPending}>
            Cancel
          </Button>
          <Button onClick={run} disabled={gen.isPending || leadIds.length === 0}>
            {gen.isPending ? (
              'Generating…'
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate{' '}
                <span className="tabular-nums">{leadIds.length * 4}</span> drafts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
