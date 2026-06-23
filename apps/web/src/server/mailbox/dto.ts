import { schema } from '@tradepilot/db'

type Row = typeof schema.emailIdentities.$inferSelect

/** Safe mailbox view — NEVER includes the ciphertext token columns. */
export interface MailboxDTO {
  id: string
  provider: Row['provider']
  email: string
  displayName: string | null
  spfStatus: Row['spfStatus']
  dkimStatus: Row['dkimStatus']
  dmarcStatus: Row['dmarcStatus']
  sendingEnabled: boolean
  warmupState: Row['warmupState']
  dailyCap: number
  sentToday: number
  domainVerifiedAt: string | null
  createdAt: string
}

export function toMailboxDTO(r: Row): MailboxDTO {
  return {
    id: r.id,
    provider: r.provider,
    email: r.email,
    displayName: r.displayName,
    spfStatus: r.spfStatus,
    dkimStatus: r.dkimStatus,
    dmarcStatus: r.dmarcStatus,
    sendingEnabled: r.sendingEnabled,
    warmupState: r.warmupState,
    dailyCap: r.dailyCap,
    sentToday: r.sentToday,
    domainVerifiedAt: r.domainVerifiedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}
