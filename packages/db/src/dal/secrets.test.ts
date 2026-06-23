import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above imports, so the mutable mocks it references must be
// created with vi.hoisted (referencing a plain top-level const would hit a TDZ).
const mocks = vi.hoisted(() => ({
  flags: { isSecretStorageEnabled: true },
  decrypt: vi.fn(),
  withTenantTransaction: vi.fn(),
}))
vi.mock('@tradepilot/shared/env', () => ({ flags: mocks.flags, env: {} }))
vi.mock('../crypto', () => ({ decrypt: (c: string, t: string) => mocks.decrypt(c, t) }))
vi.mock('../client/rls', () => ({
  withTenantTransaction: (tid: string, cb: (tx: unknown) => unknown) =>
    mocks.withTenantTransaction(tid, cb),
}))

import { makeSecretResolver } from './secrets'

const { flags, decrypt, withTenantTransaction } = mocks

/** A chainable fake of the query builder whose terminal .limit() yields `rows`. */
function txReturning(rows: unknown[]) {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  }
  return chain
}

describe('makeSecretResolver', () => {
  beforeEach(() => {
    flags.isSecretStorageEnabled = true
    decrypt.mockReset()
    withTenantTransaction.mockReset()
    withTenantTransaction.mockImplementation(async (_tid: string, cb: (tx: unknown) => unknown) =>
      cb(txReturning([{ accessTokenEnc: 'enc' }])),
    )
  })

  it('returns the decrypted access token for a verified gmail identity', async () => {
    decrypt.mockReturnValue('plain-token')
    await expect(makeSecretResolver('t1').get('gmail_oauth')).resolves.toBe('plain-token')
    expect(decrypt).toHaveBeenCalledWith('enc', 't1')
  })

  it('returns null for a non-mailbox key without opening a transaction', async () => {
    await expect(makeSecretResolver('t1').get('anthropic_api')).resolves.toBeNull()
    expect(withTenantTransaction).not.toHaveBeenCalled()
  })

  it('returns null when secret storage is disabled', async () => {
    flags.isSecretStorageEnabled = false
    await expect(makeSecretResolver('t1').get('gmail_oauth')).resolves.toBeNull()
    expect(withTenantTransaction).not.toHaveBeenCalled()
  })

  it('returns null when no verified identity exists', async () => {
    withTenantTransaction.mockImplementation(async (_t: string, cb: (tx: unknown) => unknown) =>
      cb(txReturning([])),
    )
    await expect(makeSecretResolver('t1').get('gmail_oauth')).resolves.toBeNull()
  })

  it('never throws if decrypt fails', async () => {
    decrypt.mockImplementation(() => {
      throw new Error('bad key')
    })
    await expect(makeSecretResolver('t1').get('gmail_oauth')).resolves.toBeNull()
  })
})
