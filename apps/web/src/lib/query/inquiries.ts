'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import { listInquiries, getInquiry, setInquiryStatus } from '@/server/inquiry/actions'
import type { ListInquiriesInput, InquiryStatus } from '@/server/inquiry/schemas'

interface ActionThrown extends Error {
  code?: string
}

export function useInquiries(input: ListInquiriesInput) {
  return useQuery({
    queryKey: queryKeys.inquiries.list(input),
    queryFn: async () => unwrap(await listInquiries(input)),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}

export function useInquiry(id: string) {
  return useQuery({
    queryKey: queryKeys.inquiries.detail(id),
    queryFn: async () => unwrap(await getInquiry({ id })),
    enabled: !!id,
  })
}

export function useSetInquiryStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; status: InquiryStatus }) => unwrap(await setInquiryStatus(v)),
    onSuccess: () => toast.success('Inquiry updated'),
    onError: (e: ActionThrown) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.inquiries.all }),
  })
}
