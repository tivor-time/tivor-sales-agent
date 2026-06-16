import { NextResponse } from 'next/server'
import { flags } from '@tradepilot/shared/env'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    status: 'ok',
    capabilities: {
      database: flags.isDatabaseEnabled,
      auth: flags.isAuthEnabled,
      ai: flags.isAiEnabled,
      mailboxProviders: flags.isAnyMailboxProviderConfigured,
      tradeData: flags.isTradeDataEnabled,
      billing: flags.isBillingEnabled,
      jobs: flags.isJobsEnabled,
    },
  })
}
