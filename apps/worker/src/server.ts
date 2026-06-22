import { serve } from 'inngest/node'
import { inngest } from './client'
import { functions } from './functions'

/**
 * The Inngest HTTP request handler, mounted by src/index.ts. The signing key is
 * read automatically from INNGEST_SIGNING_KEY in the environment when present;
 * absent → Inngest runs unsigned against the local dev server (graceful
 * degradation).
 */
export const inngestHandler = serve({ client: inngest, functions })
