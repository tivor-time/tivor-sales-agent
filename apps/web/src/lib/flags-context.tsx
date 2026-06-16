'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Flags } from '@tradepilot/shared/env'

/**
 * Feature flags are computed on the SERVER (from provider-key presence) and
 * passed down to client components through this context. Client code must never
 * import `@tradepilot/shared/env` directly — Next strips server-only env vars in
 * the client bundle, which would make every flag read as false.
 */
const FlagsContext = createContext<Flags | null>(null)

export function FlagsProvider({ value, children }: { value: Flags; children: ReactNode }) {
  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>
}

export function useFlags(): Flags {
  const flags = useContext(FlagsContext)
  if (!flags) throw new Error('useFlags must be used within <FlagsProvider>')
  return flags
}
