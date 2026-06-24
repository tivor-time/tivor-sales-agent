import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DegradedBanner } from '@/components/degraded-banner'

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          AI-drafted multilingual cold-email sequences with a first-class human approval queue.
        </p>
      </div>
      <DegradedBanner />
      <Card>
        <CardHeader>
          <CardTitle>Start a campaign from your leads</CardTitle>
          <CardDescription>
            Select leads on the Leads page and choose “Draft outreach” to generate a localized 4-step
            sequence (Day 1 / 3 / 7 / 14) in each buyer’s language. Drafts land in the Approval Queue —
            review and approve, then they send through your connected mailbox. Turn on Autopilot to
            skip approval and let the AI send + follow up automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/leads">Go to Leads</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/approvals">Approval Queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inbox">Open Inbox</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
