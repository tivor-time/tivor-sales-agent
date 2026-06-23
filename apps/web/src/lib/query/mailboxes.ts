'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import {
  listMailboxes,
  getDomainAuthRecords,
  verifyDomainAuth,
  setMailboxSending,
  disconnectMailbox,
} from '@/server/mailbox/actions'

interface ActionThrown extends Error {
  code?: string
}

export function useMailboxes() {
  return useQuery({
    queryKey: queryKeys.mailboxes.all,
    queryFn: async () => unwrap(await listMailboxes()),
    staleTime: 15_000,
  })
}

export function useDomainAuthRecords(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.mailboxes.dns(id),
    queryFn: async () => unwrap(await getDomainAuthRecords({ id })),
    enabled: enabled && !!id,
    staleTime: 60_000,
  })
}

export function useVerifyDomainAuth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string }) => unwrap(await verifyDomainAuth(v)),
    onSuccess: (r) =>
      r.verified
        ? toast.success('Domain verified — sending enabled')
        : toast.error('SPF/DKIM/DMARC are not all passing yet. Check the records and retry.'),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.mailboxes.all }),
  })
}

export function useSetMailboxSending() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; enabled: boolean }) => unwrap(await setMailboxSending(v)),
    onSuccess: (_r, v) => toast.success(v.enabled ? 'Sending enabled' : 'Sending paused'),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.mailboxes.all }),
  })
}

export function useDisconnectMailbox() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string }) => unwrap(await disconnectMailbox(v)),
    onSuccess: () => toast.success('Mailbox disconnected'),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.mailboxes.all }),
  })
}
