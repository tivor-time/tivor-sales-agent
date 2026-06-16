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
            nothing sends until you approve, and sending stays off until domain auth verifies.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/leads">Go to Leads</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/approvals">Approval Queue</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
