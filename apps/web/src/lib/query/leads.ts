'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import {
  listLeads,
  getLead,
  updateLeadStage,
  bulkSetStage,
  bulkTagLeads,
  bulkDeleteLeads,
  createLead,
  updateLead,
} from '@/server/leads/actions'
import type { Result } from '@/server/result'
import type { LeadDTO, LeadDetailDTO, Page } from '@/server/dto'
import type { ListLeadsInput } from '@/server/leads/schemas'

interface ActionThrown extends Error {
  code?: string
  fieldErrors?: Record<string, string[]>
}

/** Unwrap a Result<T>; throw so onError/RHF fire and a sonner toast shows. */
export function unwrap<T>(r: Result<T>): T {
  if (!r.ok) {
    const e: ActionThrown = new Error(r.error.message)
    e.code = r.error.code
    e.fieldErrors = r.error.fieldErrors
    throw e
  }
  return r.data
}

export function useLeads(input: ListLeadsInput) {
  return useQuery({
    queryKey: queryKeys.leads.list(input),
    queryFn: async () => unwrap(await listLeads(input)),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: async () => unwrap(await getLead(id)),
    enabled: !!id,
  })
}

export function useUpdateLeadStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; stage: LeadDTO['stage'] }) => unwrap(await updateLeadStage(v)),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: queryKeys.leads.all })
      const prev = qc.getQueriesData<Page<LeadDTO>>({ queryKey: ['leads', 'list'] })
      qc.setQueriesData<Page<LeadDTO>>({ queryKey: ['leads', 'list'] }, (old) =>
        old ? { ...old, rows: old.rows.map((l) => (l.id === v.id ? { ...l, stage: v.stage } : l)) } : old,
      )
      qc.setQueryData<LeadDetailDTO>(queryKeys.leads.detail(v.id), (old) =>
        old ? { ...old, lead: { ...old.lead, stage: v.stage } } : old,
      )
      return { prev }
    },
    onError: (e: ActionThrown, _v, ctx) => {
      ctx?.prev?.forEach(([k, data]) => qc.setQueryData(k, data))
      toast.error(e.message)
    },
    onSuccess: () => toast.success('Stage updated'),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}

export function useBulkSetStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { ids: string[]; stage: LeadDTO['stage'] }) => unwrap(await bulkSetStage(v)),
    onSuccess: (r) => toast.success(`${r.updated} leads updated`),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}

export function useBulkDeleteLeads() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { ids: string[] }) => unwrap(await bulkDeleteLeads(v)),
    onSuccess: (r) => toast.success(`${r.deleted} leads deleted`),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}

export function useBulkTagLeads() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { ids: string[]; add?: string[]; remove?: string[] }) =>
      unwrap(await bulkTagLeads(v)),
    onSuccess: (r) => toast.success(`${r.updated} leads tagged`),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.leads.all }),
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: Parameters<typeof createLead>[0]) => unwrap(await createLead(v)),
    onSuccess: () => {
      toast.success('Lead created')
      qc.invalidateQueries({ queryKey: queryKeys.leads.all })
    },
    onError: (e: ActionThrown) => toast.error(e.message),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: Parameters<typeof updateLead>[0]) => unwrap(await updateLead(v)),
    onSuccess: (lead) => {
      toast.success('Lead saved')
      qc.invalidateQueries({ queryKey: queryKeys.leads.detail(lead.id) })
      qc.invalidateQueries({ queryKey: queryKeys.leads.all })
    },
    onError: (e: ActionThrown) => toast.error(e.message),
  })
}
