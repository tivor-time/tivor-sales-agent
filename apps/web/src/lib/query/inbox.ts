'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import { listInbox, getInboxMessage, replyToInbound } from '@/server/inbox/actions'

interface ActionThrown extends Error {
  code?: string
}

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

export function useReplyToInbound() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { messageId: string; body: string }) => unwrap(await replyToInbound(v)),
    onSuccess: () => {
      toast.success('Reply sent')
      qc.invalidateQueries({ queryKey: queryKeys.inbox.all })
      qc.invalidateQueries({ queryKey: queryKeys.outreach.activity })
    },
    onError: (e: ActionThrown) => toast.error(e.message),
  })
}
