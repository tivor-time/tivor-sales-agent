import type { NextRequest } from 'next/server'
import { oauthCallback } from '@/server/mailbox/oauth-routes'

export function GET(req: NextRequest) {
  return oauthCallback(req, 'gmail')
}
