import { BarChart3 } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function MarketPage() {
  return (
    <ComingSoon
      title="Market Intel"
      phase="Phase 7"
      icon={BarChart3}
      description="Weekly tenant-scoped briefs: price trends, competitor shipments, and tariff changes — with citations."
    />
  )
}
