import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above imports, so mutable mocks it references use vi.hoisted.
const m = vi.hoisted(() => ({
  isDbConfigured: vi.fn(() => true),
  runInTenant: vi.fn(),
  createTenantContextFromWorker: vi.fn(async () => ({ tenantId: 't', userId: 'u' })),
  decrypt: vi.fn(() => 'access-token'),
  encrypt: vi.fn((s: string) => `enc:${s}`),
  isSendingEnabled: vi.fn(() => true),
  send: vi.fn(),
  refresh: vi.fn(),
  getMailboxProvider: vi.fn(),
}))

vi.mock('@tradepilot/db', () => ({
  isDbConfigured: m.isDbConfigured,
  runInTenant: m.runInTenant,
  createTenantContextFromWorker: m.createTenantContextFromWorker,
  decrypt: m.decrypt,
  encrypt: m.encrypt,
  schema: { emailIdentities: {}, suppressionEntries: {}, usageRecords: {} },
}))
vi.mock('@tradepilot/shared/env', () => ({ isSendingEnabled: m.isSendingEnabled, flags: {}, env: {} }))
vi.mock('@tradepilot/shared/providers/server', () => ({ getMailboxProvider: m.getMailboxProvider }))
vi.mock('drizzle-orm', () => ({
  and: () => ({}),
  eq: () => ({}),
  gt: () => ({}),
  isNull: () => ({}),
  inArray: () => ({}),
  or: () => ({}),
  desc: () => ({}),
}))

import { handleSequenceStepDue } from './sequence-step-due'

const PAYLOAD = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  sequenceStepId: '00000000-0000-0000-0000-000000000002',
  leadId: '00000000-0000-0000-0000-000000000003',
  messageId: '00000000-0000-0000-0000-000000000004',
}

const QUEUED_MESSAGE = {
  id: PAYLOAD.messageId,
  status: 'queued',
  toAddress: 'buyer@acme.com',
  subject: 'Hello',
  bodyText: 'Hi',
  bodyHtml: null,
  inReplyTo: null,
  references: [] as string[],
}

const VERIFIED_IDENTITY = {
  id: 'id-1',
  provider: 'gmail',
  email: 'sales@us.com',
  sendingEnabled: true,
  domainVerifiedAt: new Date(),
  spfStatus: 'pass',
  dkimStatus: 'pass',
  dmarcStatus: 'pass',
  warmupState: 'active',
  sentToday: 0,
  dailyCap: 200,
  accessTokenEnc: 'enc-access',
  refreshTokenEnc: 'enc-refresh',
  tokenExpiresAt: new Date(Date.now() + 3_600_000),
}

function makeCtx(o: { message?: unknown; identity?: unknown; suppressed?: unknown[] } = {}) {
  const db = {
    messages: {
      findById: vi.fn(async () => (o.message === undefined ? QUEUED_MESSAGE : o.message)),
      update: vi.fn(async () => ({})),
    },
    emailIdentities: {
      findFirst: vi.fn(async () => (o.identity === undefined ? VERIFIED_IDENTITY : o.identity)),
      update: vi.fn(async () => ({})),
    },
    suppressionEntries: { findMany: vi.fn(async () => o.suppressed ?? []) },
    usageRecords: { findFirst: vi.fn(async () => null), insert: vi.fn(async () => ({})) },
  }
  return { tenantId: 't', db }
}

function wire(ctx: ReturnType<typeof makeCtx>) {
  m.runInTenant.mockImplementation(async (_p: unknown, fn: (c: unknown) => unknown) => fn(ctx))
}

describe('handleSequenceStepDue (send path)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.isDbConfigured.mockReturnValue(true)
    m.isSendingEnabled.mockReturnValue(true)
    m.decrypt.mockReturnValue('access-token')
    m.send.mockResolvedValue({ providerMessageId: 'pmid', threadId: 'thr' })
    m.getMailboxProvider.mockReturnValue({ send: m.send, refresh: m.refresh })
  })

  it('no-ops when the database is not configured', async () => {
    m.isDbConfigured.mockReturnValue(false)
    await handleSequenceStepDue(PAYLOAD, 'r1')
    expect(m.runInTenant).not.toHaveBeenCalled()
  })

  it('skips a message that is not queued', async () => {
    const ctx = makeCtx({ message: { ...QUEUED_MESSAGE, status: 'sent' } })
    wire(ctx)
    await handleSequenceStepDue(PAYLOAD, 'r2')
    expect(ctx.db.emailIdentities.findFirst).not.toHaveBeenCalled()
    expect(m.send).not.toHaveBeenCalled()
  })

  it('holds the message when no verified identity exists', async () => {
    const ctx = makeCtx({ identity: null })
    wire(ctx)
    await handleSequenceStepDue(PAYLOAD, 'r3')
    expect(m.send).not.toHaveBeenCalled()
    expect(ctx.db.messages.update).not.toHaveBeenCalled()
  })

  it('marks the message suppressed when the recipient is suppressed', async () => {
    const ctx = makeCtx({ suppressed: [{ scope: 'email', value: 'buyer@acme.com' }] })
    wire(ctx)
    await handleSequenceStepDue(PAYLOAD, 'r4')
    expect(m.send).not.toHaveBeenCalled()
    expect(ctx.db.messages.update).toHaveBeenCalledWith(QUEUED_MESSAGE.id, { status: 'suppressed' })
  })

  it('does not send when the daily cap is reached', async () => {
    const ctx = makeCtx({ identity: { ...VERIFIED_IDENTITY, sentToday: 200, dailyCap: 200 } })
    wire(ctx)
    await handleSequenceStepDue(PAYLOAD, 'r5')
    expect(m.send).not.toHaveBeenCalled()
  })

  it('sends a queued message and records it sent + usage', async () => {
    const ctx = makeCtx()
    wire(ctx)
    await handleSequenceStepDue(PAYLOAD, 'r6')
    expect(m.send).toHaveBeenCalledTimes(1)
    expect(ctx.db.messages.update).toHaveBeenCalledWith(QUEUED_MESSAGE.id, {
      status: 'sending',
      emailIdentityId: 'id-1',
      fromAddress: 'sales@us.com',
    })
    expect(ctx.db.messages.update).toHaveBeenCalledWith(
      QUEUED_MESSAGE.id,
      expect.objectContaining({ status: 'sent', providerMessageId: 'pmid' }),
    )
    expect(ctx.db.usageRecords.insert).toHaveBeenCalledTimes(1)
  })

  it('marks the message failed when the provider send throws', async () => {
    const ctx = makeCtx()
    wire(ctx)
    m.send.mockRejectedValue(new Error('Gmail 401'))
    await handleSequenceStepDue(PAYLOAD, 'r7')
    expect(ctx.db.messages.update).toHaveBeenCalledWith(
      QUEUED_MESSAGE.id,
      expect.objectContaining({ status: 'failed' }),
    )
  })
})
