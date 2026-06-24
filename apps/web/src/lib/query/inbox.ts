'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import { listInbox, getInboxMessage } from '@/server/inbox/actions'

export function useInbox() {
  return useQuery({
    queryKey: queryKeys.inbox.all,
    queryFn: async () => unwrap(await listInbox()),
    staleTime: 15_000,
  })
}

export function useInboxMessage(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.inbox.message(id) : queryKeys.inbox.all,
    queryFn: async () => unwrap(await getInboxMessage({ id: id! })),
    enabled: !!id,
    staleTime: 60_000,
  })
}
