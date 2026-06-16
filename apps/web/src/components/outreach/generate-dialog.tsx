'use client'

import { useState, type ReactNode } from 'react'
import { Send } from 'lucide-react'
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

  function run() {
    const campaignName = name.trim() || `Outreach ${new Date().toISOString().slice(0, 10)}`
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
          <DialogTitle>Draft outreach for {leadIds.length} lead(s)</DialogTitle>
          <DialogDescription>
            Generates a localized 4-step sequence (Day 1 / 3 / 7 / 14) per lead, in each buyer’s
            language. Drafts go to the approval queue — nothing is sent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Campaign name</Label>
          <Input
            id="campaign-name"
            placeholder={`Outreach ${new Date().toISOString().slice(0, 10)}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={gen.isPending}>
            Cancel
          </Button>
          <Button onClick={run} disabled={gen.isPending || leadIds.length === 0}>
            {gen.isPending ? 'Generating…' : `Generate ${leadIds.length * 4} drafts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
