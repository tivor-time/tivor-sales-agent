import { Mail, Rocket, SlidersHorizontal } from 'lucide-react'
import { DegradedBanner } from '@/components/degraded-banner'
import { PageContainer } from '@/components/shell/page-container'
import { MailboxesView } from '@/components/mailbox/mailboxes-view'
import { AutopilotCard } from '@/components/settings/autopilot-card'
import { IconTile, SectionHeading } from '@/components/ui/stat'

export default function SettingsPage() {
  return (
    <PageContainer>
      <div className="flex items-start gap-3.5">
        <IconTile icon={SlidersHorizontal} tone="primary" size="lg" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Gmail or Microsoft mailbox in one click. Deliverability is handled by your
            provider — no DNS setup required.
          </p>
        </div>
      </div>
      <DegradedBanner />

      <section className="space-y-3">
        <SectionHeading icon={Rocket}>Automation</SectionHeading>
        <AutopilotCard />
      </section>

      <section className="space-y-3">
        <SectionHeading icon={Mail}>Mailboxes</SectionHeading>
        <MailboxesView />
      </section>
    </PageContainer>
  )
}
