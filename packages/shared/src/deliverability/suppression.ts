export interface SuppressionKey {
  scope: 'email' | 'domain'
  value: string
}

export function normalizeSuppressionEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function emailDomain(email: string): string | undefined {
  const d = normalizeSuppressionEmail(email).split('@')[1]
  return d || undefined
}

/** True if the email (or its domain) is on the suppression list. Enforced at send time. */
export function isSuppressed(email: string, entries: SuppressionKey[]): boolean {
  const e = normalizeSuppressionEmail(email)
  const dom = emailDomain(e)
  return entries.some(
    (s) =>
      (s.scope === 'email' && s.value === e) || (s.scope === 'domain' && !!dom && s.value === dom),
  )
}
