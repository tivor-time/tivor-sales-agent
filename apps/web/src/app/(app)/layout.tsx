import { flags } from '@tradepilot/shared/env'
import { AppShell } from '@/components/shell/app-shell'

/**
 * Authenticated app segment. Middleware handles sign-in / active-org gating when
 * Clerk is configured; when it isn't, we render the shell against the local dev
 * workspace. (The forced-onboarding gate lands with the onboarding wizard.)
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell authEnabled={flags.isAuthEnabled}>{children}</AppShell>
}
