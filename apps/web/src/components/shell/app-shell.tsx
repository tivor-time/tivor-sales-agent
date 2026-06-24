'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CopilotWidget } from '@/components/ai/copilot-widget'

const COLLAPSE_KEY = 'tp-sidebar-collapsed'

export function AppShell({
  children,
  authEnabled,
}: {
  children: ReactNode
  authEnabled: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Restore the desktop collapse preference after mount (avoids hydration mismatch).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <div className="h-svh overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Desktop sidebar (collapsible to an icon rail) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      {/* Mobile sheet nav (always full labels) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex h-svh flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-16' : 'lg:pl-64',
        )}
      >
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          onToggleSidebar={toggleCollapsed}
          collapsed={collapsed}
          authEnabled={authEnabled}
        />
        {/* Full-height content region. Each page owns its own scroll + width:
            content pages use <PageContainer>; workspace pages (Inbox/Copilot) fill it. */}
        <main id="main" className="app-canvas min-h-0 flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      <CopilotWidget />
    </div>
  )
}
