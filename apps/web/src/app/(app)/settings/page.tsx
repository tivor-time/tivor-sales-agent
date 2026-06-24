import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { MailboxesView } from '@/components/mailbox/mailboxes-view'
import { AutopilotCard } from '@/components/settings/autopilot-card'

export default function SettingsPage() {
  return (
    <PageContainer>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Connect your Gmail or Microsoft mailbox in one click. Deliverability is handled by your
          provider — no DNS setup required.
        </p>
      </div>
      <DegradedBanner />
      <AutopilotCard />
      <MailboxesView />
    </PageContainer>
  )
}
