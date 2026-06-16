'use client'

import { Menu } from 'lucide-react'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from './theme-toggle'

export function Topbar({
  onMenuClick,
  authEnabled,
}: {
  onMenuClick: () => void
  authEnabled: boolean
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0">
        {authEnabled ? (
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
        ) : (
          <Badge variant="secondary">Local Dev Workspace</Badge>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {authEnabled ? <UserButton afterSignOutUrl="/" /> : null}
      </div>
    </header>
  )
}
