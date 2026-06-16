import {
  LayoutDashboard,
  Users,
  Send,
  Inbox,
  Package,
  BarChart3,
  ClipboardCheck,
  Beaker,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@tradepilot/shared'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** advisory only — real authorization is enforced server-side in the DAL */
  roles?: Role[]
  badgeKey?: 'approvals' | 'inquiries'
  phase?: string
}

export const NAV: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Leads', href: '/leads', icon: Users },
  { title: 'Campaigns', href: '/campaigns', icon: Send, phase: 'P2' },
  { title: 'Approval Queue', href: '/approvals', icon: ClipboardCheck, badgeKey: 'approvals', phase: 'P2' },
  { title: 'Inbox', href: '/inbox', icon: Inbox, badgeKey: 'inquiries', phase: 'P4' },
  { title: 'Listings', href: '/listings', icon: Package, phase: 'P6' },
  { title: 'Market Intel', href: '/market', icon: BarChart3, phase: 'P7' },
  { title: 'Samples & Follow-ups', href: '/samples', icon: Beaker, phase: 'P5' },
  { title: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'admin'] },
]
