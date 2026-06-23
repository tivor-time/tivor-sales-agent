import { startOAuth } from '@/server/mailbox/oauth-routes'

export function GET() {
  return startOAuth('gmail')
}
