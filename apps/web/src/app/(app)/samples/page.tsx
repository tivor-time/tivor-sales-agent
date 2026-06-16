import { Beaker } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function SamplesPage() {
  return (
    <ComingSoon
      title="Samples & Follow-ups"
      phase="Phase 5"
      icon={Beaker}
      description="Track samples, automate feedback nudges, and watch the pipeline board move."
    />
  )
}
