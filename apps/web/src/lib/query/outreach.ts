'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import {
  listPendingDrafts,
  listOutreachActivity,
  generateCampaignDrafts,
  approveDraft,
  rejectDraft,
  editDraft,
  bulkApproveDrafts,
} from '@/server/outreach/actions'

interface ThrownError extends Error {
  code?: string
}

export function usePendingDrafts() {
  return useQuery({
    queryKey: queryKeys.outreach.pending,
    queryFn: async () => unwrap(await listPendingDrafts()),
    staleTime: 15_000,
  })
}

export function useOutreachActivity() {
  return useQuery({
    queryKey: queryKeys.outreach.activity,
    queryFn: async () => unwrap(await listOutreachActivity()),
    staleTime: 15_000,
  })
}

export function useGenerateDrafts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { name: string; leadIds: string[] }) =>
      unwrap(await generateCampaignDrafts(v)),
    onSuccess: (r) => {
      toast.success(`${r.drafts} drafts created for ${r.leads} lead(s)`)
      qc.invalidateQueries({ queryKey: queryKeys.outreach.pending })
    },
    onError: (e: ThrownError) => toast.error(e.message),
  })
}

export function useApproveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string }) => unwrap(await approveDraft(v)),
    onSuccess: () => {
      toast.success('Approved — queued to send')
      qc.invalidateQueries({ queryKey: queryKeys.outreach.pending })
    },
    onError: (e: ThrownError) => toast.error(e.message),
  })
}

export function useRejectDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string }) => unwrap(await rejectDraft(v)),
    onSuccess: () => {
      toast.success('Draft rejected')
      qc.invalidateQueries({ queryKey: queryKeys.outreach.pending })
    },
    onError: (e: ThrownError) => toast.error(e.message),
  })
}

export function useEditDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; subject: string; bodyText: string }) =>
      unwrap(await editDraft(v)),
    onSuccess: () => {
      toast.success('Draft saved')
      qc.invalidateQueries({ queryKey: queryKeys.outreach.pending })
    },
    onError: (e: ThrownError) => toast.error(e.message),
  })
}

export function useBulkApproveDrafts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { ids: string[] }) => unwrap(await bulkApproveDrafts(v)),
    onSuccess: (r) => {
      toast.success(`${r.approved} drafts approved`)
      qc.invalidateQueries({ queryKey: queryKeys.outreach.pending })
    },
    onError: (e: ThrownError) => toast.error(e.message),
  })
}
