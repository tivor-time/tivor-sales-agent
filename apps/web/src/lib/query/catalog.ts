'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import { listCatalogItems, upsertCatalogItem, deleteCatalogItem } from '@/server/catalog/actions'
import type { UpsertCatalogInput } from '@/server/catalog/schemas'

interface ThrownError extends Error {
  code?: string
}

export function useCatalogItems(filter: { search?: string; active?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.catalog.list(filter),
    queryFn: async () => unwrap(await listCatalogItems(filter)),
    staleTime: 30_000,
  })
}

export function useUpsertCatalogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: UpsertCatalogInput) => unwrap(await upsertCatalogItem(v)),
    onSuccess: () => {
      toast.success('Catalog item saved')
      qc.invalidateQueries({ queryKey: queryKeys.catalog.all })
    },
    onError: (e: ThrownError) => toast.error(e.message),
  })
}

export function useDeleteCatalogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string }) => unwrap(await deleteCatalogItem(v)),
    onSuccess: () => {
      toast.success('Catalog item removed')
      qc.invalidateQueries({ queryKey: queryKeys.catalog.all })
    },
    onError: (e: ThrownError) => toast.error(e.message),
  })
}
