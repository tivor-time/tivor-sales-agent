'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import { getAutopilot, setAutopilot } from '@/server/settings/actions'

interface ActionThrown extends Error {
  code?: string
}

export function useAutopilot() {
  return useQuery({
    queryKey: queryKeys.settings.autopilot,
    queryFn: async () => unwrap(await getAutopilot()),
    staleTime: 30_000,
  })
}

export function useSetAutopilot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { enabled: boolean }) => unwrap(await setAutopilot(v)),
    onSuccess: (r) =>
      toast.success(
        r.enabled
          ? 'Autopilot ON — the AI will send and follow up automatically.'
          : 'Autopilot off — drafts wait in the approval queue.',
      ),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.settings.autopilot }),
  })
}
