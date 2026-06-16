import { Send } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function CampaignsPage() {
  return (
    <ComingSoon
      title="Campaigns"
      phase="Phase 2"
      icon={Send}
      description="AI-drafted multilingual cold-email sequences with a first-class human approval queue."
    />
  )
}
