'use client'

import { Menu, PanelLeft } from 'lucide-react'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from './theme-toggle'

export function Topbar({
  onMenuClick,
  onToggleSidebar,
  collapsed,
  authEnabled,
}: {
  onMenuClick: () => void
  onToggleSidebar: () => void
  collapsed: boolean
  authEnabled: boolean
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-card/70 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/60 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden text-muted-foreground hover:text-foreground lg:inline-flex"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
        onClick={onToggleSidebar}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      <div className="ml-1 min-w-0">
        {authEnabled ? (
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
        ) : (
          <Badge variant="secondary">Local Dev Workspace</Badge>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        {authEnabled ? (
          <>
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
            <UserButton afterSignOutUrl="/" />
          </>
        ) : null}
      </div>
    </header>
  )
}
