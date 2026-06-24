import type { ListLeadsInput } from '@/server/leads/schemas'
import type { ListInquiriesInput } from '@/server/inquiry/schemas'
import type { ListFollowUpsInput } from '@/server/followup/schemas'
import type { AnalyticsRangeDays } from '@/server/analytics/actions'

export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    list: (input: ListLeadsInput) => ['leads', 'list', input] as const,
    detail: (id: string) => ['leads', 'detail', id] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    list: (filter: { search?: string; active?: boolean }) => ['catalog', 'list', filter] as const,
  },
  outreach: {
    pending: ['outreach', 'pending'] as const,
    activity: ['outreach', 'activity'] as const,
  },
  mailboxes: {
    all: ['mailboxes'] as const,
    dns: (id: string) => ['mailboxes', 'dns', id] as const,
  },
  inquiries: {
    all: ['inquiries'] as const,
    list: (input: ListInquiriesInput) => ['inquiries', 'list', input] as const,
    detail: (id: string) => ['inquiries', 'detail', id] as const,
  },
  inbox: {
    all: ['inbox'] as const,
    message: (id: string) => ['inbox', 'message', id] as const,
  },
  followups: {
    all: ['followups'] as const,
    list: (input: ListFollowUpsInput) => ['followups', 'list', input] as const,
  },
  analytics: {
    report: (rangeDays: AnalyticsRangeDays) => ['analytics', 'report', rangeDays] as const,
  },
} as const
