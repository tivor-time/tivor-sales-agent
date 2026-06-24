'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { unwrap } from './leads'
import { getAnalyticsReport, type AnalyticsRangeDays } from '@/server/analytics/actions'

export function useAnalyticsReport(rangeDays: AnalyticsRangeDays) {
  return useQuery({
    queryKey: queryKeys.analytics.report(rangeDays),
    queryFn: async () => unwrap(await getAnalyticsReport({ rangeDays })),
    staleTime: 15_000,
  })
}
