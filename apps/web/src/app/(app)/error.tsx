'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/error-state'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // TODO(P0 observability): report to Sentry once wired.
    console.error(error)
  }, [error])

  return (
    <ErrorState
      title="This page hit an error"
      description={error.message || 'An unexpected error occurred.'}
      onRetry={reset}
    />
  )
}
