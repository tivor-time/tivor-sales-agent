import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DB layer so no real connection is needed; we test the guard logic.
const isDbConfigured = vi.fn()
const runInTenant = vi.fn()
const createTenantContextFromWorker = vi.fn()
vi.mock('@tradepilot/db', () => ({
  isDbConfigured: () => isDbConfigured(),
  runInTenant: (...args: unknown[]) => runInTenant(...args),
  createTenantContextFromWorker: (...args: unknown[]) => createTenantContextFromWorker(...args),
}))

import { handleSequenceStepDue } from './sequence-step-due'

const payload = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  sequenceStepId: '00000000-0000-0000-0000-000000000002',
  leadId: '00000000-0000-0000-0000-000000000003',
  messageId: '00000000-0000-0000-0000-000000000004',
}

describe('handleSequenceStepDue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('no-ops without touching the DB when DATABASE_URL is absent', async () => {
    isDbConfigured.mockReturnValue(false)
    await expect(handleSequenceStepDue(payload, 'evt_1')).resolves.toBeUndefined()
    expect(createTenantContextFromWorker).not.toHaveBeenCalled()
    expect(runInTenant).not.toHaveBeenCalled()
  })

  it('rejects a payload missing tenantId (never fans out unscoped)', async () => {
    isDbConfigured.mockReturnValue(true)
    await expect(handleSequenceStepDue({ sequenceStepId: 'x' }, 'evt_2')).rejects.toThrow()
    expect(createTenantContextFromWorker).not.toHaveBeenCalled()
  })

  it('only advances messages that are still queued', async () => {
    isDbConfigured.mockReturnValue(true)
    const findById = vi.fn().mockResolvedValue({ id: payload.messageId, status: 'sent' })
    const update = vi.fn()
    createTenantContextFromWorker.mockResolvedValue({ tenantId: payload.tenantId })
    runInTenant.mockImplementation(
      async (_partial: unknown, fn: (ctx: unknown) => Promise<unknown>) =>
        fn({ db: { messages: { findById, update } } }),
    )
    await handleSequenceStepDue(payload, 'evt_3')
    expect(findById).toHaveBeenCalledWith(payload.messageId)
    expect(update).not.toHaveBeenCalled()
  })
})
