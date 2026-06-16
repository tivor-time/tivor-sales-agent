import { TrendingUp, Users, ShieldCheck, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DegradedBanner } from '@/components/degraded-banner'

const KPIS = [
  { label: 'Pipeline value', value: '—', note: 'Tracked from P5', icon: TrendingUp },
  { label: 'Active leads', value: '—', note: 'Import in P1', icon: Users },
  { label: 'Deliverability', value: 'Sending off', note: 'Verify domain auth (P3)', icon: ShieldCheck },
  { label: 'Latest brief', value: 'None yet', note: 'Weekly briefs in P7', icon: FileText },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Pipeline health, deliverability, and your latest market brief.
        </p>
      </div>

      <DegradedBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {k.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{k.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{k.note}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
