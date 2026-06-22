import 'server-only'
import { Inngest } from 'inngest'
import { env, flags } from '@tradepilot/shared/env'
import { logger } from '@tradepilot/shared/logger'
import type { EventName, EventPayload } from '@tradepilot/shared'

/**
 * The web app's Inngest client. Mirrors the worker's client (same id, same
 * zero-secret dev behavior) but hosts no functions — it only emits events. We
 * intentionally omit the SDK `schemas` option; the event contract lives in
 * @tradepilot/shared and is enforced by the typed `sendEvent` helper below.
 */
export const inngest = new Inngest({
  id: 'tradepilot',
  isDev: !flags.isJobsEnabled,
  eventKey: env.INNGEST_EVENT_KEY,
})

/**
 * Type-safe event emit — the single outbound surface for server actions.
 * Swallows transport errors so a missing/unreachable Inngest dev server can
 * never break a server action; the event simply isn't delivered until Inngest
 * is configured (graceful degradation).
 */
export async function sendEvent<K extends EventName>(
  name: K,
  data: EventPayload<K>,
): Promise<void> {
  try {
    await inngest.send({ name, data })
  } catch (err) {
    logger.warn({ err, event: name }, 'inngest send failed (is the dev server running?)')
  }
}
