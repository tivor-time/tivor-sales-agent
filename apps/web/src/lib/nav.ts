import {
  LayoutDashboard,
  Users,
  Send,
  Inbox,
  BarChart3,
  Bot,
  ClipboardCheck,
  ListChecks,
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
  { title: 'Campaigns', href: '/campaigns', icon: Send },
  { title: 'Approval Queue', href: '/approvals', icon: ClipboardCheck, badgeKey: 'approvals' },
  { title: 'Inbox', href: '/inbox', icon: Inbox, badgeKey: 'inquiries' },
  { title: 'AI Chat', href: '/copilot', icon: Bot },
  { title: 'Follow-ups', href: '/follow-ups', icon: ListChecks },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'admin'] },
]
