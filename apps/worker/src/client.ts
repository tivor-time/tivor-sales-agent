import { Inngest } from 'inngest'
import { env, flags } from '@tradepilot/shared/env'

/**
 * The single Inngest client for the worker.
 *
 * We deliberately do NOT pass the SDK's `schemas` option: the EventSchemas API
 * has changed across inngest majors, so instead the event contract lives in
 * @tradepilot/shared and is enforced at the boundaries — `parseEvent` validates
 * every inbound payload (defense in depth) and the web `sendEvent` helper types
 * every outbound one. That keeps a single source of truth and decouples us from
 * inngest's schema-typing churn.
 *
 * Graceful degradation: with no INNGEST keys, `isDev` is true and `eventKey` is
 * undefined, so the client runs unsigned against the local Inngest dev server.
 */
export const inngest = new Inngest({
  id: 'tradepilot',
  isDev: !flags.isJobsEnabled,
  eventKey: env.INNGEST_EVENT_KEY,
})
