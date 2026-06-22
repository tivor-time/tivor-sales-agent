import { describe, it, expect } from 'vitest'
import { eventSchemas, parseEvent } from '@tradepilot/shared'
import { EVENT as SEQ } from './functions/sequence-step-due'
import { EVENT as FOLLOWUP } from './functions/followup-nudge-due'
import { EVENT as WARMUP } from './functions/mailbox-warmup-tick'
import { EVENT as INBOUND } from './functions/email-inbound-received'
import { EVENT as BOUNCE } from './functions/email-bounce-received'

describe('worker event contract', () => {
  it('every registered handler triggers on a known event name', () => {
    for (const name of [SEQ, FOLLOWUP, WARMUP, INBOUND, BOUNCE]) {
      expect(Object.keys(eventSchemas)).toContain(name)
    }
  })

  it('parseEvent accepts a valid payload and rejects a missing tenantId', () => {
    expect(() =>
      parseEvent('sequence/step.due', {
        tenantId: '00000000-0000-0000-0000-000000000001',
        sequenceStepId: '00000000-0000-0000-0000-000000000002',
        leadId: '00000000-0000-0000-0000-000000000003',
      }),
    ).not.toThrow()
    expect(() => parseEvent('sequence/step.due', { sequenceStepId: 'x' })).toThrow()
  })
})
