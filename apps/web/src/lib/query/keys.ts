import type { ListLeadsInput } from '@/server/leads/schemas'
import type { ListInquiriesInput } from '@/server/inquiry/schemas'

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
} as const
