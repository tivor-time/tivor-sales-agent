import { Settings } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      phase="Phase 3+"
      icon={Settings}
      description="Mailboxes, domain auth, providers, team, billing, and GDPR tools."
    />
  )
}
