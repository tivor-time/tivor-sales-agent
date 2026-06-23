'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import { listFollowUps, createFollowUp, updateFollowUp } from '@/server/followup/actions'
import type { ListFollowUpsInput, TaskStatus, TaskCadence } from '@/server/followup/schemas'

interface ActionThrown extends Error {
  code?: string
}

export function useFollowUps(input: ListFollowUpsInput) {
  return useQuery({
    queryKey: queryKeys.followups.list(input),
    queryFn: async () => unwrap(await listFollowUps(input)),
    staleTime: 15_000,
  })
}

export function useCreateFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      title: string
      description?: string
      dueDate?: string
      cadence?: TaskCadence
      leadId?: string
    }) => unwrap(await createFollowUp(v)),
    onSuccess: () => {
      toast.success('Follow-up created')
      qc.invalidateQueries({ queryKey: queryKeys.followups.all })
    },
    onError: (e: ActionThrown) => toast.error(e.message),
  })
}

export function useUpdateFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; status?: TaskStatus; dueDate?: string; title?: string; description?: string }) =>
      unwrap(await updateFollowUp(v)),
    onSuccess: () => toast.success('Follow-up updated'),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.followups.all }),
  })
}
