'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plug } from 'lucide-react'
import { NAV } from '@/lib/nav'
import { cn } from '@/lib/utils'

export function Sidebar({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col">
      {/* Brand lockup */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-5',
        )}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Plug className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-base font-semibold tracking-tight text-foreground">
            TradePilot
          </span>
        )}
      </div>

      {/* Nav */}
      <div className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
        )}
        <nav aria-label="Primary" className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.title : undefined}
                className={cn(
                  'group relative flex items-center rounded-md text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {/* Thin left accent for the active item */}
                {active && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-primary',
                      collapsed ? 'w-0.5' : 'w-[3px] -ml-3',
                    )}
                  />
                )}
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                {!collapsed && item.phase ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {item.phase}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer hint */}
      {!collapsed && (
        <div className="border-t border-border p-3">
          <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <Plug className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Connect Gmail to start sending
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
