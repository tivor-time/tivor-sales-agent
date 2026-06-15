/** Typed errors for fail-closed / graceful-degradation behavior. */

export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database not configured (DATABASE_URL missing).')
    this.name = 'DatabaseUnavailableError'
  }
}

export class MissingContextError extends Error {
  constructor(message = 'No tenant context on request.') {
    super(message)
    this.name = 'MissingContextError'
  }
}

export class TenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant not found or inaccessible: ${tenantId}`)
    this.name = 'TenantNotFoundError'
  }
}

export class TenantIsolationError extends Error {
  constructor(message = 'Cross-tenant access denied.') {
    super(message)
    this.name = 'TenantIsolationError'
  }
}

export class SendingDisabledError extends Error {
  constructor(message = 'Sending is disabled until domain authentication is verified.') {
    super(message)
    this.name = 'SendingDisabledError'
  }
}

export class ForbiddenError extends Error {
  constructor(requiredRole: string) {
    super(`Insufficient role. Requires at least: ${requiredRole}`)
    this.name = 'ForbiddenError'
  }
}

export class SecretStorageUnavailableError extends Error {
  constructor() {
    super('Secret storage not configured (MASTER_ENCRYPTION_KEY missing).')
    this.name = 'SecretStorageUnavailableError'
  }
}
