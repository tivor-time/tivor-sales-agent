import type { ListLeadsInput } from '@/server/leads/schemas'

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
} as const
