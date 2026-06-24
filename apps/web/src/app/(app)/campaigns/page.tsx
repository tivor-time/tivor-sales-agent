import Link from 'next/link'
import { ArrowRight, Inbox, ListChecks, Send, Users, Zap, Workflow } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { IconTile, SectionHeading } from '@/components/ui/stat'

const STEPS = [
  {
    icon: Users,
    title: 'Select leads',
    body: 'Pick buyers on the Leads page and choose “Draft outreach”.',
  },
  {
    icon: Send,
    title: 'Generate a sequence',
    body: 'AI writes a localized 4-step sequence (Day 1 / 3 / 7 / 14) per lead.',
  },
  {
    icon: ListChecks,
    title: 'Review & approve',
    body: 'Edit or approve each draft in the Approval Queue. Nothing sends early.',
  },
  {
    icon: Zap,
    title: 'Send & follow up',
    body: 'Approved mail goes out via your mailbox — or let Autopilot handle it.',
  },
]

export default function CampaignsPage() {
  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-drafted multilingual cold-email sequences with a first-class human approval queue.
        </p>
      </div>

      <DegradedBanner />

      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="max-w-2xl">
            <SectionHeading icon={Workflow}>How it works</SectionHeading>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              Start a campaign from your leads
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              From a handful of leads to a reviewed, multilingual sequence in four steps. Turn on
              Autopilot to skip approval and let the AI send and follow up on its own.
            </p>
          </div>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <li
                  key={step.title}
                  className="rounded-xl border bg-card/60 p-4 shadow-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between">
                    <IconTile icon={Icon} tone="primary" />
                    <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground/70">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              )
            })}
          </ol>

          <div className="mt-6 flex flex-wrap gap-2 border-t pt-6">
            <Button asChild>
              <Link href="/leads">
                <Users className="h-4 w-4" /> Go to Leads
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/approvals">
                <ListChecks className="h-4 w-4" /> Approval Queue
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inbox">
                <Inbox className="h-4 w-4" /> Open Inbox
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
